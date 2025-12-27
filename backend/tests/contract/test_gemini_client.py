"""
Contract tests for GeminiClient.

These tests define the expected interface and behavior of the Gemini client.
Following TDD: Write tests FIRST, ensure they FAIL, then implement.
"""

import pytest
from pydantic import BaseModel

from src.lib.gemini_client import GeminiClient, GeminiClientConfig, GeminiAPIError


class TestGeminiClientEnrichTask:
    """Contract tests for GeminiClient.enrich_task() method."""

    @pytest.fixture
    def gemini_config(self) -> GeminiClientConfig:
        """Provide a valid Gemini client configuration for testing."""
        return GeminiClientConfig(
            api_key="AIzaTEST_KEY_FOR_TESTING",
            model="gemini-2.5-flash",
            timeout=15.0,
            max_retries=3,
        )

    @pytest.fixture
    def gemini_client(self, gemini_config: GeminiClientConfig) -> GeminiClient:
        """Provide a GeminiClient instance for testing."""
        return GeminiClient(gemini_config)

    @pytest.mark.asyncio
    async def test_enrich_task_returns_string(self, gemini_client: GeminiClient) -> None:
        """Test that enrich_task() returns a string (enriched text).

        CONTRACT: enrich_task(text: str) -> str
        """
        # This test will FAIL until we implement enrich_task()
        result = await gemini_client.enrich_task("call John tmrw")
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_enrich_task_enhances_text(self, gemini_client: GeminiClient) -> None:
        """Test that enrich_task() enhances natural language text.

        CONTRACT: Input should be clarified and expanded
        """
        # This test will FAIL until we implement enrich_task()
        user_input = "call John tmrw"
        result = await gemini_client.enrich_task(user_input)

        # Expected: enriched text should be more complete
        assert "John" in result
        assert len(result) >= len(user_input)

    @pytest.mark.asyncio
    async def test_enrich_task_handles_empty_string(self, gemini_client: GeminiClient) -> None:
        """Test that enrich_task() handles empty input gracefully.

        CONTRACT: Should raise ValueError for empty input
        """
        # This test will FAIL until we implement validation
        with pytest.raises(ValueError, match="empty"):
            await gemini_client.enrich_task("")


class TestGeminiClientExtractMetadata:
    """Contract tests for GeminiClient.extract_metadata() method."""

    @pytest.fixture
    def gemini_config(self) -> GeminiClientConfig:
        """Provide a valid Gemini client configuration for testing."""
        return GeminiClientConfig(
            api_key="AIzaTEST_KEY_FOR_TESTING",
            model="gemini-2.5-flash",
            timeout=15.0,
            max_retries=3,
        )

    @pytest.fixture
    def gemini_client(self, gemini_config: GeminiClientConfig) -> GeminiClient:
        """Provide a GeminiClient instance for testing."""
        return GeminiClient(gemini_config)

    class SampleMetadataSchema(BaseModel):
        """Sample Pydantic schema for testing metadata extraction."""

        persons: list[str]
        deadline: str | None

    @pytest.mark.asyncio
    async def test_extract_metadata_returns_pydantic_model(
        self, gemini_client: GeminiClient
    ) -> None:
        """Test that extract_metadata() returns a Pydantic model instance.

        CONTRACT: extract_metadata(text: str, schema: Type[T]) -> T
        """
        # This test will FAIL until we implement extract_metadata()
        result = await gemini_client.extract_metadata(
            "Call John tomorrow", self.SampleMetadataSchema
        )
        assert isinstance(result, self.SampleMetadataSchema)

    @pytest.mark.asyncio
    async def test_extract_metadata_populates_fields(self, gemini_client: GeminiClient) -> None:
        """Test that extract_metadata() populates schema fields correctly.

        CONTRACT: Extracted data should match Pydantic schema structure
        """
        # This test will FAIL until we implement extract_metadata()
        result = await gemini_client.extract_metadata(
            "Call John tomorrow", self.SampleMetadataSchema
        )
        assert isinstance(result.persons, list)
        assert isinstance(result.deadline, (str, type(None)))

    @pytest.mark.asyncio
    async def test_extract_metadata_handles_empty_text(self, gemini_client: GeminiClient) -> None:
        """Test that extract_metadata() handles empty input gracefully.

        CONTRACT: Should raise ValueError for empty input
        """
        # This test will FAIL until we implement validation
        with pytest.raises(ValueError, match="empty"):
            await gemini_client.extract_metadata("", self.SampleMetadataSchema)
