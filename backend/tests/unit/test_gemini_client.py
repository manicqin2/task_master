"""
Unit tests for GeminiClient initialization and error handling.

Following TDD: Write tests FIRST, ensure they FAIL, then implement.
"""

import pytest

from src.lib.gemini_client import (
    GeminiClient,
    GeminiClientConfig,
    GeminiAPIError,
    validate_config,
)


class TestGeminiClientConfig:
    """Unit tests for GeminiClientConfig validation."""

    def test_valid_config_succeeds(self) -> None:
        """Test that a valid configuration is accepted."""
        config = GeminiClientConfig(
            api_key="AIzaValidKey123",
            model="gemini-2.5-flash",
            timeout=15.0,
            max_retries=3,
        )
        # Should not raise
        assert config.api_key == "AIzaValidKey123"

    def test_missing_api_key_raises_error(self) -> None:
        """Test that missing API key raises ValueError."""
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            GeminiClientConfig(api_key="", model="gemini-2.5-flash")

    def test_invalid_api_key_format_raises_error(self) -> None:
        """Test that invalid API key format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid Gemini API key format"):
            GeminiClientConfig(api_key="INVALID_KEY", model="gemini-2.5-flash")

    def test_unsupported_model_raises_error(self) -> None:
        """Test that unsupported model name raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported model"):
            GeminiClientConfig(api_key="AIzaValidKey123", model="gpt-4")

    def test_timeout_below_minimum_raises_error(self) -> None:
        """Test that timeout below 5 seconds raises ValueError."""
        with pytest.raises(ValueError, match="Timeout must be between"):
            GeminiClientConfig(
                api_key="AIzaValidKey123", model="gemini-2.5-flash", timeout=1.0
            )

    def test_timeout_above_maximum_raises_error(self) -> None:
        """Test that timeout above 120 seconds raises ValueError."""
        with pytest.raises(ValueError, match="Timeout must be between"):
            GeminiClientConfig(
                api_key="AIzaValidKey123", model="gemini-2.5-flash", timeout=150.0
            )

    def test_max_retries_negative_raises_error(self) -> None:
        """Test that negative max_retries raises ValueError."""
        with pytest.raises(ValueError, match="max_retries must be between"):
            GeminiClientConfig(
                api_key="AIzaValidKey123", model="gemini-2.5-flash", max_retries=-1
            )

    def test_max_retries_above_maximum_raises_error(self) -> None:
        """Test that max_retries above 10 raises ValueError."""
        with pytest.raises(ValueError, match="max_retries must be between"):
            GeminiClientConfig(
                api_key="AIzaValidKey123", model="gemini-2.5-flash", max_retries=15
            )


class TestGeminiClientInitialization:
    """Unit tests for GeminiClient.__init__()."""

    def test_client_initializes_with_valid_config(self) -> None:
        """Test that client initializes successfully with valid config."""
        config = GeminiClientConfig(
            api_key="AIzaValidKey123",
            model="gemini-2.5-flash",
            timeout=15.0,
            max_retries=3,
        )
        client = GeminiClient(config)
        assert client.config == config

    def test_client_stores_config_reference(self) -> None:
        """Test that client stores configuration reference."""
        config = GeminiClientConfig(
            api_key="AIzaValidKey123",
            model="gemini-2.5-flash",
        )
        client = GeminiClient(config)
        assert client.config.api_key == "AIzaValidKey123"
        assert client.config.model == "gemini-2.5-flash"


class TestGeminiAPIErrorHandling:
    """Unit tests for GeminiAPIError exception handling."""

    def test_401_authentication_error(self) -> None:
        """Test that 401 error has correct properties.

        CONTRACT: Authentication errors should not be retryable
        """
        error = GeminiAPIError(
            message="Authentication failed",
            status_code=401,
            is_retryable=False,
        )
        assert error.status_code == 401
        assert not error.is_retryable
        assert "Authentication failed" in str(error)

    def test_429_rate_limit_error(self) -> None:
        """Test that 429 error has correct properties.

        CONTRACT: Rate limit errors should be retryable with retry_after
        """
        error = GeminiAPIError(
            message="Rate limit exceeded",
            status_code=429,
            retry_after=60,
            is_retryable=True,
        )
        assert error.status_code == 429
        assert error.is_retryable
        assert error.retry_after == 60

    def test_500_server_error(self) -> None:
        """Test that 500 error has correct properties.

        CONTRACT: Server errors should be retryable
        """
        error = GeminiAPIError(
            message="Internal server error",
            status_code=500,
            is_retryable=True,
        )
        assert error.status_code == 500
        assert error.is_retryable

    def test_timeout_error(self) -> None:
        """Test that timeout error has correct properties.

        CONTRACT: Timeout errors should be retryable
        """
        error = GeminiAPIError(
            message="Request timeout",
            is_retryable=True,
        )
        assert error.is_retryable
        assert "timeout" in error.message.lower()

    def test_error_message_is_accessible(self) -> None:
        """Test that error message is accessible via message attribute."""
        error = GeminiAPIError(message="Test error")
        assert error.message == "Test error"

    def test_error_code_is_stored(self) -> None:
        """Test that Gemini-specific error codes are stored."""
        error = GeminiAPIError(
            message="API error",
            error_code="RESOURCE_EXHAUSTED",
        )
        assert error.error_code == "RESOURCE_EXHAUSTED"


class TestGeminiClientStartupValidation:
    """Unit tests for startup validation (User Story 2 - Migration)."""

    def test_missing_api_key_fails_fast_on_startup(self) -> None:
        """Test that missing GEMINI_API_KEY raises clear error on client initialization.

        CONTRACT: Fail fast at startup with clear error message
        USER STORY 2: Migration should provide clear feedback when API key is missing
        """
        with pytest.raises(ValueError, match="GEMINI_API_KEY environment variable is required"):
            GeminiClientConfig(
                api_key="",  # Empty API key
                model="gemini-2.5-flash",
            )

    def test_api_key_validation_provides_help_url(self) -> None:
        """Test that API key validation error includes help URL.

        CONTRACT: Error messages should guide users to get API key
        """
        try:
            GeminiClientConfig(api_key="", model="gemini-2.5-flash")
            assert False, "Should have raised ValueError"
        except ValueError as e:
            error_message = str(e)
            assert "GEMINI_API_KEY" in error_message
            assert "https://aistudio.google.com/" in error_message
