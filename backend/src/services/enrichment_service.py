"""Enrichment service for improving task descriptions and extracting metadata."""
from datetime import datetime, timezone
import json
import os
from typing import Optional

from src.lib.gemini_client import GeminiClient, GeminiClientConfig, GeminiAPIError
from src.lib.metadata_parsers import parse_deadline
from src.models.task_metadata import MetadataExtractionResponse
from src.services.metadata_extraction import MetadataExtractor


class EnrichmentService:
    """Service for enriching task descriptions and extracting metadata using LLM."""

    def __init__(self):
        """Initialize enrichment service with Gemini client."""
        # Initialize Gemini client with environment configuration
        config = GeminiClientConfig(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            timeout=float(os.getenv("GEMINI_TIMEOUT", "15.0")),
            max_retries=int(os.getenv("GEMINI_MAX_RETRIES", "3")),
        )
        self.gemini = GeminiClient(config)

        # Metadata extraction now uses Gemini (migrated from Ollama)
        self.confidence_threshold = 0.7

    async def enrich(self, user_input: str) -> str:
        """Enrich user input with spelling correction and improved wording.

        Args:
            user_input: Raw user input text.

        Returns:
            Enriched text with corrections and improvements.

        Raises:
            Exception: If enrichment fails (e.g., Gemini API unavailable).
        """
        try:
            enriched_text = await self.gemini.enrich_task(user_input)
            return enriched_text.strip()
        except GeminiAPIError as e:
            # Re-raise with context
            raise Exception(f"Enrichment failed: {e.message}") from e
        except Exception as e:
            raise Exception(f"Enrichment failed: {str(e)}") from e

    async def extract_metadata(
        self, user_input: str, reference_time: Optional[datetime] = None
    ) -> MetadataExtractionResponse:
        """Extract structured metadata from task description using Gemini.

        Args:
            user_input: Raw user input text
            reference_time: Reference time for relative date parsing (defaults to now)

        Returns:
            MetadataExtractionResponse with extracted fields and confidence scores

        Raises:
            Exception: If metadata extraction fails
        """
        try:
            # Use Gemini's structured output to extract metadata
            metadata = await self.gemini.extract_metadata(
                user_input,
                MetadataExtractionResponse
            )
            return metadata
        except GeminiAPIError as e:
            raise Exception(f"Metadata extraction failed: {e.message}") from e
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

    def should_populate_field(self, confidence: float) -> bool:
        """Check if a field should be auto-populated based on confidence.

        Args:
            confidence: Confidence score from 0.0 to 1.0

        Returns:
            True if confidence meets or exceeds threshold
        """
        return confidence >= self.confidence_threshold

    def requires_attention(self, response: MetadataExtractionResponse) -> bool:
        """Check if task requires user attention due to low-confidence fields.

        Args:
            response: Metadata extraction response

        Returns:
            True if any critical field has low confidence
        """
        # Project is critical - if missing or low confidence, needs attention
        if not response.project or response.project_confidence < self.confidence_threshold:
            return True
        return False

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
            "task_type": response.task_type,
            "task_type_confidence": response.task_type_confidence,
            "priority": response.priority,
            "priority_confidence": response.priority_confidence,
            "effort_estimate": response.effort_estimate,
            "effort_confidence": response.effort_confidence,
            "dependencies": response.dependencies,
            "dependencies_confidence": response.dependencies_confidence,
            "tags": response.tags,
            "tags_confidence": response.tags_confidence,
            "chain_of_thought": response.chain_of_thought,
        })
