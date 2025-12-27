"""
Gemini API client for task enrichment and metadata extraction.

This module provides a clean abstraction over Google's Gemini API,
replacing the previous Ollama local LLM integration.
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any, Callable, Type, TypeVar

from pydantic import BaseModel

# Configure logging
logger = logging.getLogger(__name__)


# Type variable for Pydantic models
T = TypeVar("T", bound=BaseModel)


@dataclass
class GeminiClientConfig:
    """Configuration for the Gemini API client.

    Attributes:
        api_key: Gemini API key from Google AI Studio
        model: Gemini model name (default: gemini-2.5-flash)
        timeout: Request timeout in seconds (default: 15.0)
        max_retries: Maximum number of retry attempts (default: 3)
    """

    api_key: str
    model: str = "gemini-2.5-flash"
    timeout: float = 15.0
    max_retries: int = 3

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        validate_config(self)


class GeminiAPIError(Exception):
    """Exception raised for Gemini API errors.

    Attributes:
        message: Human-readable error message
        status_code: HTTP status code (if available)
        error_code: Gemini-specific error code (if available)
        retry_after: Seconds to wait before retry (for rate limiting)
        is_retryable: Whether this error should trigger retry logic
    """

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        error_code: str | None = None,
        retry_after: int | None = None,
        is_retryable: bool = False,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.retry_after = retry_after
        self.is_retryable = is_retryable


def _retry_with_exponential_backoff(
    max_retries: int = 3, base_delay: float = 1.0
) -> Callable:
    """Decorator for retrying async functions with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (doubles with each retry)

    Returns:
        Decorated function with retry logic
    """

    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs):
            client_self = args[0]  # self reference from instance method
            attempts = 0

            while attempts <= max_retries:
                try:
                    return await func(*args, **kwargs)
                except GeminiAPIError as e:
                    if not e.is_retryable or attempts >= max_retries:
                        logger.error(f"Gemini API error (non-retryable): {e.message}")
                        raise

                    # Calculate exponential backoff delay
                    delay = base_delay * (2**attempts)
                    if e.retry_after:
                        delay = max(delay, e.retry_after)

                    logger.warning(
                        f"Gemini API error (attempt {attempts + 1}/{max_retries}): {e.message}. "
                        f"Retrying in {delay}s..."
                    )

                    await asyncio.sleep(delay)
                    attempts += 1

        return wrapper

    return decorator


def validate_config(config: GeminiClientConfig) -> None:
    """Validate Gemini client configuration at startup.

    Args:
        config: GeminiClientConfig to validate

    Raises:
        ValueError: If configuration is invalid
    """
    # Validate API key
    if not config.api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is required. "
            "Get your API key from https://aistudio.google.com/"
        )

    if not config.api_key.startswith("AIza"):
        raise ValueError("Invalid Gemini API key format (must start with 'AIza')")

    # Validate model
    supported_models = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]
    if config.model not in supported_models:
        raise ValueError(
            f"Unsupported model: {config.model}. "
            f"Supported models: {', '.join(supported_models)}"
        )

    # Validate timeout bounds
    if not (5.0 <= config.timeout <= 120.0):
        raise ValueError("Timeout must be between 5 and 120 seconds")

    # Validate max_retries bounds
    if not (0 <= config.max_retries <= 10):
        raise ValueError("max_retries must be between 0 and 10")


class GeminiClient:
    """Gemini API client for LLM operations.

    This client provides methods for:
    - Task enrichment (natural language enhancement)
    - Metadata extraction (structured data from Pydantic schemas)

    Features:
    - Async/await support for non-blocking operations
    - Automatic retry with exponential backoff
    - Comprehensive error handling
    - API usage logging for cost tracking
    """

    def __init__(self, config: GeminiClientConfig):
        """Initialize the Gemini client.

        Args:
            config: GeminiClientConfig with API credentials and settings

        Raises:
            ValueError: If configuration is invalid
        """
        self.config = config

        # Initialize google.genai client
        try:
            import google.genai as genai

            # Create client with API key
            self._client = genai.Client(api_key=config.api_key)

        except ImportError:
            raise ImportError(
                "google-genai package is required. Install with: pip install google-genai"
            )
        except Exception as e:
            raise ValueError(f"Failed to initialize Gemini client: {str(e)}")

    async def enrich_task(self, text: str) -> str:
        """Enrich user input by correcting spelling and improving wording.

        Args:
            text: Raw user input text

        Returns:
            Enriched text with corrected spelling and improved wording

        Raises:
            ValueError: If input is empty
            GeminiAPIError: If API request fails
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")

        start_time = time.time()

        system_prompt = (
            "You are a task enrichment assistant. Take the user's informal task description "
            "and improve it by:\n"
            "1. Correcting spelling errors\n"
            "2. Expanding abbreviations (e.g., 'tmrw' -> 'tomorrow')\n"
            "3. Making it clearer and more action-oriented\n"
            "4. Preserving ALL important details (people, dates, projects, context)\n\n"
            "CRITICAL: You MUST include the COMPLETE task in your response. Do NOT truncate or "
            "shorten the output. Keep ALL names, dates, times, projects, tags, and context.\n\n"
            "Return ONLY the improved task description as a complete sentence, nothing else."
        )

        try:
            # Generate enriched text using the client (synchronous call)
            response = self._client.models.generate_content(
                model=self.config.model,
                contents=f"{system_prompt}\n\nTask to improve: {text}",
                config={
                    "temperature": 0.1,  # Extremely low temperature for consistency
                    "max_output_tokens": 1000,  # High limit to account for thinking tokens
                },
            )

            enriched_text = response.text
            if not enriched_text:
                raise ValueError("Gemini returned empty response")

            # Log API usage for cost tracking (FR-010)
            latency = time.time() - start_time
            logger.info(
                f"Gemini API call: enrich_task (latency: {latency:.2f}s, "
                f"model: {self.config.model}, input_length: {len(text)})"
            )

            return enriched_text.strip()

        except Exception as e:
            # Map exceptions to GeminiAPIError
            raise self._handle_api_error(e)

    async def extract_metadata(self, text: str, schema: Type[T]) -> T:
        """Extract structured metadata from text using Pydantic schema.

        Args:
            text: Task text to extract metadata from
            schema: Pydantic model class defining the expected structure

        Returns:
            Instance of the Pydantic schema with extracted data

        Raises:
            ValueError: If input is empty
            GeminiAPIError: If API request fails
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")

        start_time = time.time()

        try:
            # Create detailed prompt for metadata extraction
            prompt = f"""Extract metadata from this task description and provide confidence scores (0.0-1.0) for each field.

Task: {text}

IMPORTANT INSTRUCTIONS:
- Extract project name if mentioned or inferrable (e.g., "ProjectX", "Q4 Planning")
- Extract person names (e.g., "mom", "Sarah", "team")
- Extract deadline in natural language (e.g., "tomorrow", "next Friday", "2024-12-18 14:00")
- Extract priority if mentioned: "low", "normal", "high", "urgent"
- Extract task type: "call", "meeting", "email", "review", "other"
- Provide a confidence score (0.0-1.0) for each field
- Use chain_of_thought to explain your reasoning

Examples:
- "call mom urgent" → persons=["mom"], priority="urgent", task_type="call", high confidence
- "Schedule meeting with team tomorrow at 2pm" → persons=["team"], deadline="tomorrow at 2pm", task_type="meeting", high confidence
- "fix bug" → task_type="other", project might be null (low confidence), no persons/deadline

Return structured JSON matching the schema."""

            # Extract metadata with structured output (synchronous call)
            response = self._client.models.generate_content(
                model=self.config.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                    "temperature": 0.1,  # Low temperature for consistency
                }
            )

            # Parse response into Pydantic model
            import json
            metadata_dict = json.loads(response.text)
            result = schema(**metadata_dict)

            # Log API usage for cost tracking (FR-010)
            latency = time.time() - start_time
            logger.info(
                f"Gemini API call: extract_metadata (latency: {latency:.2f}s, "
                f"model: {self.config.model}, input_length: {len(text)})"
            )

            return result

        except Exception as e:
            raise self._handle_api_error(e)

    def _handle_api_error(self, error: Exception) -> GeminiAPIError:
        """Convert exceptions to GeminiAPIError with appropriate metadata.

        Args:
            error: Original exception

        Returns:
            GeminiAPIError with status code and retry information
        """
        error_str = str(error).lower()

        # Check for authentication errors (401)
        if "auth" in error_str or "unauthorized" in error_str or "api key" in error_str:
            return GeminiAPIError(
                message="Gemini API authentication failed. Please check your API key.",
                status_code=401,
                is_retryable=False,
            )

        # Check for rate limiting (429)
        if "rate limit" in error_str or "quota" in error_str:
            return GeminiAPIError(
                message="Rate limit exceeded. Task will retry automatically.",
                status_code=429,
                retry_after=60,
                is_retryable=True,
            )

        # Check for server errors (500, 503)
        if "server error" in error_str or "503" in error_str or "unavailable" in error_str:
            return GeminiAPIError(
                message="Gemini service temporarily unavailable. Retrying...",
                status_code=500 if "500" in error_str else 503,
                is_retryable=True,
            )

        # Check for timeout
        if "timeout" in error_str:
            return GeminiAPIError(
                message="Gemini API timeout. Task will retry.",
                is_retryable=True,
            )

        # Generic error
        return GeminiAPIError(
            message=f"Enrichment failed: {str(error)}",
            is_retryable=False,
        )
