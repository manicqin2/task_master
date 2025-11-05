"""Background task queue for async enrichment."""
from sqlalchemy.ext.asyncio import AsyncSession

from .enrichment_service import EnrichmentService
from .task_service import TaskService
from ..models.enums import EnrichmentStatus


async def enrich_task_background(
    task_id: str,
    db: AsyncSession,
    enrichment_service: EnrichmentService,
) -> None:
    """Background worker for task enrichment.

    This function runs asynchronously in the background to enrich tasks.
    It handles the complete enrichment workflow:
    1. Update status to PROCESSING
    2. Call EnrichmentService
    3. Update status to COMPLETED or FAILED
    4. Store enriched text or error message

    Args:
        task_id: Task UUID to enrich.
        db: Database session.
        enrichment_service: Service for enriching tasks.
    """
    task_service = TaskService(db)

    try:
        # Get task
        task = await task_service.get_by_id(task_id)

        # Update to processing
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.PROCESSING,
        )

        # Enrich task
        enriched_text = await enrichment_service.enrich(task.user_input)

        # Update to completed
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.COMPLETED,
            enriched_text=enriched_text,
        )

    except Exception as e:
        # Handle enrichment failure (FR-018)
        error_message = str(e)

        # Update to failed with error message
        await task_service.update_enrichment(
            task_id,
            status=EnrichmentStatus.FAILED,
            error_message=error_message,
        )
