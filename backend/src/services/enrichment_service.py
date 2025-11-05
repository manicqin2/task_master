"""Enrichment service for improving task descriptions."""
from ..lib.ollama_client import get_ollama_client


class EnrichmentService:
    """Service for enriching task descriptions using LLM."""

    def __init__(self):
        """Initialize enrichment service."""
        self.ollama = get_ollama_client()

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
