"""
Integration tests for enrichment workflow with Gemini API.

These tests verify the end-to-end workflow of task enrichment using Gemini.
Following TDD: Write tests FIRST, ensure they FAIL, then implement.
"""

import pytest
from pydantic import BaseModel

from src.lib.gemini_client import GeminiClient, GeminiClientConfig


class TaskMetadata(BaseModel):
    """Sample task metadata schema for integration testing."""

    project: str | None
    persons: list[str]
    deadline: str | None
    task_type: str | None
    priority: str | None


class TestEnrichmentWorkflowWithGemini:
    """Integration tests for full enrichment workflow using Gemini API."""

    @pytest.fixture
    def gemini_client(self) -> GeminiClient:
        """Provide a configured GeminiClient for testing.

        Note: Uses test API key. In real tests, this would use a mock or test account.
        """
        config = GeminiClientConfig(
            api_key="AIzaTEST_KEY_FOR_INTEGRATION",
            model="gemini-2.5-flash",
            timeout=15.0,
            max_retries=3,
        )
        return GeminiClient(config)

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Gemini API implementation - will FAIL until T012-T016 complete")
    async def test_full_enrichment_workflow(self, gemini_client: GeminiClient) -> None:
        """Test complete enrichment workflow: enrich text → extract metadata.

        Workflow:
        1. User submits raw input: "call John tmrw about project Alpha"
        2. Gemini enriches to: "Call John tomorrow about project Alpha"
        3. Gemini extracts metadata: {persons: ["John"], deadline: "tomorrow", project: "Alpha"}

        CONTRACT: End-to-end workflow matches Ollama behavior
        """
        # Step 1: Enrich user input
        user_input = "call John tmrw about project Alpha"
        enriched_text = await gemini_client.enrich_task(user_input)

        # Verify enrichment
        assert isinstance(enriched_text, str)
        assert "John" in enriched_text
        assert len(enriched_text) > 0

        # Step 2: Extract metadata from enriched text
        metadata = await gemini_client.extract_metadata(enriched_text, TaskMetadata)

        # Verify metadata extraction
        assert isinstance(metadata, TaskMetadata)
        assert "John" in metadata.persons
        assert metadata.project is not None
        assert "Alpha" in (metadata.project or "")

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Gemini API implementation - will FAIL until T012-T016 complete")
    async def test_enrichment_performance_target(self, gemini_client: GeminiClient) -> None:
        """Test that enrichment completes within performance target (<1.5s average).

        SUCCESS CRITERIA (SC-001): <1.5 seconds average latency
        """
        import time

        user_input = "call John tomorrow"

        start_time = time.time()
        enriched_text = await gemini_client.enrich_task(user_input)
        elapsed_time = time.time() - start_time

        # Verify result
        assert isinstance(enriched_text, str)

        # Verify performance (with generous tolerance for test environment)
        assert elapsed_time < 5.0, f"Enrichment took {elapsed_time}s (target: <1.5s avg, <5s p95)"

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Gemini API implementation - will FAIL until T012-T016 complete")
    async def test_metadata_extraction_performance_target(
        self, gemini_client: GeminiClient
    ) -> None:
        """Test that metadata extraction completes within performance target.

        SUCCESS CRITERIA (SC-001): <1.5 seconds average latency
        """
        import time

        task_text = "Call John tomorrow about project Alpha"

        start_time = time.time()
        metadata = await gemini_client.extract_metadata(task_text, TaskMetadata)
        elapsed_time = time.time() - start_time

        # Verify result
        assert isinstance(metadata, TaskMetadata)

        # Verify performance
        assert elapsed_time < 5.0, f"Extraction took {elapsed_time}s (target: <1.5s avg, <5s p95)"

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Gemini API implementation - will FAIL until T012-T016 complete")
    async def test_gemini_api_usage_is_logged(self, gemini_client: GeminiClient, caplog) -> None:
        """Test that Gemini API usage is logged for cost tracking.

        FUNCTIONAL REQUIREMENT (FR-010): Log API usage for monitoring and cost tracking
        """
        user_input = "call John tomorrow"

        await gemini_client.enrich_task(user_input)

        # Verify API usage was logged
        assert any("Gemini API" in record.message for record in caplog.records)

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires error handling implementation - will FAIL until T016 complete")
    async def test_enrichment_handles_api_error_gracefully(
        self, gemini_client: GeminiClient
    ) -> None:
        """Test that API errors are handled gracefully.

        FUNCTIONAL REQUIREMENT (FR-005): Handle errors gracefully with descriptive messages
        """
        # Simulate API error by using invalid configuration
        bad_config = GeminiClientConfig(
            api_key="AIzaINVALID_KEY",
            model="gemini-2.5-flash",
        )
        bad_client = GeminiClient(bad_config)

        # Should raise GeminiAPIError with clear message
        from src.lib.gemini_client import GeminiAPIError

        with pytest.raises(GeminiAPIError) as exc_info:
            await bad_client.enrich_task("test input")

        # Verify error message is descriptive
        assert exc_info.value.message is not None
        assert len(exc_info.value.message) > 0
