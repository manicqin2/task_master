"""Ollama LLM client using OpenAI-compatible API."""
import os
from typing import Optional

from openai import AsyncOpenAI


class OllamaClient:
    """Client for interacting with Ollama via OpenAI-compatible API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        """Initialize Ollama client.

        Args:
            base_url: Ollama API base URL. Defaults to OLLAMA_BASE_URL env var.
            model: Model name to use. Defaults to OLLAMA_MODEL env var.
            timeout: Request timeout in seconds. Defaults to OLLAMA_TIMEOUT env var or 60.0.
        """
        self.base_url = base_url or os.getenv(
            "OLLAMA_BASE_URL", "http://ollama:11434"
        )
        # Append /v1 for OpenAI-compatible endpoint
        if not self.base_url.endswith("/v1"):
            self.base_url = f"{self.base_url}/v1"

        self.model = model or os.getenv("OLLAMA_MODEL", "llama3.2")
        self.timeout = timeout or float(os.getenv("OLLAMA_TIMEOUT", "60.0"))

        # Initialize OpenAI client pointing to Ollama
        self.client = AsyncOpenAI(
            base_url=self.base_url,
            api_key="ollama",  # Ollama doesn't require real API key
            timeout=self.timeout,
        )

    async def enrich_task(self, user_input: str) -> str:
        """Enrich user input by correcting spelling and improving wording.

        Args:
            user_input: Raw user input text.

        Returns:
            Enriched text with corrected spelling and improved wording.

        Raises:
            Exception: If enrichment fails.
        """
        system_prompt = (
            "You are a task enrichment assistant. Your job is to take informal, "
            "possibly misspelled task descriptions and improve them by:\n"
            "1. Correcting spelling errors\n"
            "2. Making the language clearer and more action-oriented\n"
            "3. Using proper action verbs (e.g., 'Call', 'Send', 'Schedule')\n"
            "4. Expanding common abbreviations (e.g., 'tmrw' -> 'tomorrow')\n\n"
            "Keep the core meaning intact. Only return the improved task text, "
            "nothing else."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.3,  # Low temperature for consistent, focused output
                max_tokens=100,  # Tasks should be concise
            )

            enriched_text = response.choices[0].message.content
            if not enriched_text:
                raise ValueError("Ollama returned empty response")

            return enriched_text.strip()

        except Exception as e:
            raise Exception(f"Enrichment failed: {str(e)}") from e


# Global client instance
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create global Ollama client instance.

    Returns:
        OllamaClient: Shared Ollama client instance.
    """
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
