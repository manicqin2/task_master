"""Enrichment service for improving task descriptions and extracting metadata."""
from datetime import datetime, timezone
import json
from typing import Optional

from src.lib.ollama_client import get_ollama_client
from src.lib.metadata_parsers import parse_deadline
from src.models.task_metadata import MetadataExtractionResponse
from src.services.metadata_extraction import MetadataExtractor


class EnrichmentService:
    """Service for enriching task descriptions and extracting metadata using LLM."""

    def __init__(self):
        """Initialize enrichment service."""
        self.ollama = get_ollama_client()
        self.metadata_extractor = MetadataExtractor(
            llm_client=self.ollama.client,
            reference_time=datetime.now(timezone.utc),
        )

    async def enrich(self, user_input: str) -> str:
        """Enrich user input with spelling correction and improved wording.

        Args:
            user_input: Raw user input text.

        Returns:
            Enriched text with corrections and improvements.

        Raises:
            Exception: If enrichment fails (e.g., Ollama unavailable).
        """
        try:
            enriched_text = await self.ollama.enrich_task(user_input)
            return enriched_text.strip()
        except Exception as e:
            # Re-raise with context
            raise Exception(f"Enrichment failed: {str(e)}") from e

    async def extract_metadata(
        self, user_input: str, reference_time: Optional[datetime] = None
    ) -> MetadataExtractionResponse:
        """Extract structured metadata from task description.

        Args:
            user_input: Raw user input text
            reference_time: Reference time for relative date parsing (defaults to now)

        Returns:
            MetadataExtractionResponse with extracted fields and confidence scores

        Raises:
            Exception: If metadata extraction fails
        """
        if reference_time:
            self.metadata_extractor.reference_time = reference_time

        try:
            return await self.metadata_extractor.extract(user_input)
        except Exception as e:
            raise Exception(f"Metadata extraction failed: {str(e)}") from e

    def parse_deadline_from_text(
        self, deadline_text: Optional[str], reference_time: Optional[datetime] = None
    ) -> Optional[datetime]:
        """Parse deadline text into datetime.

        Args:
            deadline_text: Natural language deadline (e.g., "tomorrow", "next Friday")
            reference_time: Reference time for relative dates (defaults to now)

        Returns:
            Parsed datetime in UTC, or None if parsing fails
        """
        if not deadline_text:
            return None

        ref_time = reference_time or datetime.now(timezone.utc)
        return parse_deadline(deadline_text, ref_time)

    def serialize_metadata_suggestions(
        self, response: MetadataExtractionResponse
    ) -> str:
        """Serialize metadata extraction response to JSON string.

        Args:
            response: Metadata extraction response

        Returns:
            JSON string representation
        """
        return json.dumps({
            "project": response.project,
            "project_confidence": response.project_confidence,
            "persons": response.persons,
            "persons_confidence": response.persons_confidence,
            "deadline": response.deadline,
            "deadline_confidence": response.deadline_confidence,
            "task_type": response.task_type,  # Now string instead of enum
            "task_type_confidence": response.task_type_confidence,
            "priority": response.priority,  # Now string instead of enum
            "priority_confidence": response.priority_confidence,
            "effort_estimate": response.effort_estimate,
            "effort_confidence": response.effort_confidence,
            "dependencies": response.dependencies,
            "dependencies_confidence": response.dependencies_confidence,
            "tags": response.tags,
            "tags_confidence": response.tags_confidence,
            "chain_of_thought": response.chain_of_thought,
        })
