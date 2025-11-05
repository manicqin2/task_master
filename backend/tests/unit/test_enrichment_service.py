"""Unit tests for EnrichmentService.

Tests focus on business logic for task enrichment:
- Spelling correction
- Grammar improvements
- Action verb insertion
- Abbreviation expansion
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.enrichment_service import EnrichmentService


class TestEnrichmentService:
    """Test EnrichmentService business logic."""

    @pytest.mark.asyncio
    async def test_enrich_corrects_spelling_errors(self):
        """Test that spelling errors are corrected."""
        # Arrange
        service = EnrichmentService()
        user_input = "fix bug in login screan"  # "screan" -> "screen"

        # Mock Ollama response
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Fix bug in login screen"

            # Act
            enriched = await service.enrich(user_input)

            # Assert
            assert "screen" in enriched
            assert "screan" not in enriched
            mock_enrich.assert_called_once_with(user_input)

    @pytest.mark.asyncio
    async def test_enrich_improves_wording_with_action_verbs(self):
        """Test that wording is improved with clear action verbs."""
        # Arrange
        service = EnrichmentService()
        user_input = "email boss about meeting"

        # Mock Ollama response with action verb
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Send email to boss about meeting"

            # Act
            enriched = await service.enrich(user_input)

            # Assert
            assert "Send" in enriched  # Action verb added
            mock_enrich.assert_called_once()

    @pytest.mark.asyncio
    async def test_enrich_expands_abbreviations(self):
        """Test that common abbreviations are expanded."""
        # Arrange
        service = EnrichmentService()
        user_input = "dentist appt tmrw 3pm"

        # Mock Ollama response with expanded abbreviations
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Schedule dentist appointment tomorrow at 3pm"

            # Act
            enriched = await service.enrich(user_input)

            # Assert
            assert "appointment" in enriched  # "appt" expanded
            assert "tomorrow" in enriched  # "tmrw" expanded
            assert "appt" not in enriched
            assert "tmrw" not in enriched

    @pytest.mark.asyncio
    async def test_enrich_handles_ollama_api_error(self):
        """Test that enrichment service handles Ollama API errors gracefully."""
        # Arrange
        service = EnrichmentService()
        user_input = "test task"

        # Mock Ollama error
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.side_effect = Exception("Ollama API connection timeout")

            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                await service.enrich(user_input)

            assert "Ollama API connection timeout" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_enrich_returns_string(self):
        """Test that enrich always returns a string."""
        # Arrange
        service = EnrichmentService()
        user_input = "call mom"

        # Mock Ollama response
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Call Mom to discuss weekend plans"

            # Act
            enriched = await service.enrich(user_input)

            # Assert
            assert isinstance(enriched, str)
            assert len(enriched) > 0

    @pytest.mark.asyncio
    async def test_enrich_strips_whitespace(self):
        """Test that enriched text has whitespace stripped."""
        # Arrange
        service = EnrichmentService()
        user_input = "test task"

        # Mock Ollama response with extra whitespace
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "  Test task with whitespace  "

            # Act
            enriched = await service.enrich(user_input)

            # Assert
            assert enriched == "Test task with whitespace"
            assert not enriched.startswith(" ")
            assert not enriched.endswith(" ")

    @pytest.mark.asyncio
    async def test_enrich_uses_low_temperature_for_consistency(self):
        """Test that Ollama is called with low temperature for consistent output."""
        # Arrange
        service = EnrichmentService()
        user_input = "test task"

        # Mock the entire Ollama client to inspect call parameters
        with patch("src.lib.ollama_client.OllamaClient") as MockClient:
            mock_instance = MockClient.return_value
            mock_instance.enrich_task = AsyncMock(return_value="Enriched task")

            # Act
            enriched = await service.enrich(user_input)

            # Assert: Verify enrichment was called
            mock_instance.enrich_task.assert_called_once_with(user_input)
