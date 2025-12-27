"""Background task queue for async enrichment and metadata extraction."""
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from .enrichment_service import EnrichmentService
from .task_service import TaskService
from ..models.enums import EnrichmentStatus


async def enrich_task_background(
    task_id: str,
    db: AsyncSession,
    enrichment_service: EnrichmentService,
) -> None:
    """Background worker for task enrichment and metadata extraction.

    This function runs asynchronously in the background to enrich tasks and extract metadata.
    It handles the complete enrichment workflow:
    1. Update workbench status to PROCESSING
    2. Call EnrichmentService for text enrichment
    3. Extract metadata using MetadataExtractor
    4. Parse deadline and populate fields based on confidence threshold
    5. Update workbench status to COMPLETED or FAILED
    6. Store enriched text, metadata, or error message

    Feature 004: Task Metadata Extraction - Phase 3 User Story 1 (T025)

    Args:
        task_id: Task UUID to enrich.
        db: Database session.
        enrichment_service: Service for enriching tasks and extracting metadata.
    """
    task_service = TaskService(db)

    try:
        # Get task and workbench entry
        task = await task_service.get_by_id(task_id)
        workbench = await task_service.get_workbench_entry(task_id)

        # Update to processing
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.PROCESSING,
        )

        # Enrich task text
        enriched_text = await enrichment_service.enrich(task.user_input)

        # Extract metadata using Gemini
        metadata_response = await enrichment_service.extract_metadata(
            task.user_input,
            reference_time=datetime.now(timezone.utc),
        )

        # Store full extraction response as JSON in workbench for frontend suggestions
        workbench.metadata_suggestions = enrichment_service.serialize_metadata_suggestions(
            metadata_response
        )

        # Populate high-confidence fields on task
        if enrichment_service.should_populate_field(metadata_response.project_confidence):
            task.project = metadata_response.project

        if enrichment_service.should_populate_field(metadata_response.persons_confidence):
            task.persons = json.dumps(metadata_response.persons)

        if enrichment_service.should_populate_field(metadata_response.task_type_confidence):
            task.task_type = metadata_response.task_type

        if enrichment_service.should_populate_field(metadata_response.priority_confidence):
            task.priority = metadata_response.priority

        if enrichment_service.should_populate_field(metadata_response.deadline_confidence):
            task.deadline_text = metadata_response.deadline
            # Parse deadline text to datetime
            if metadata_response.deadline:
                parsed_deadline = enrichment_service.parse_deadline_from_text(
                    metadata_response.deadline,
                    reference_time=datetime.now(timezone.utc),
                )
                task.deadline_parsed = parsed_deadline

        if enrichment_service.should_populate_field(metadata_response.effort_confidence):
            task.effort_estimate = metadata_response.effort_estimate

        if enrichment_service.should_populate_field(metadata_response.dependencies_confidence):
            task.dependencies = json.dumps(metadata_response.dependencies)

        if enrichment_service.should_populate_field(metadata_response.tags_confidence):
            task.tags = json.dumps(metadata_response.tags)

        # Set extracted_at timestamp on task
        task.extracted_at = datetime.now(timezone.utc)

        # Set requires_attention flag based on confidence scores (T016)
        task.requires_attention = enrichment_service.requires_attention(metadata_response)

        # Commit task metadata changes
        await db.commit()

        # Update workbench to completed
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.COMPLETED,
            enriched_text=enriched_text,
        )

    except Exception as e:
        # Handle enrichment/extraction failure (FR-018)
        error_message = str(e)

        # Update workbench to failed with error message
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.FAILED,
            error_message=error_message,
        )
