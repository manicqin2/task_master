"""Integration tests for enrichment workflow.

Tests verify the complete enrichment process:
- Task creation triggers background enrichment
- Status transitions: pending → processing → completed/failed
- Enriched text is stored correctly
- Error handling for enrichment failures
"""
import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.task import Task
from src.models.enums import EnrichmentStatus, TaskStatus
from src.services.task_service import TaskService
from src.services.enrichment_service import EnrichmentService
from src.services.task_queue import enrich_task_background


class TestEnrichmentWorkflow:
    """Test complete enrichment workflow integration."""

    @pytest.mark.asyncio
    async def test_enrichment_pending_to_completed_transition(self, db_session: AsyncSession):
        """Test successful enrichment transitions task from pending to completed."""
        # Arrange: Create task service and task
        task_service = TaskService(db_session)
        task = await task_service.create("call mom")

        assert task.enrichment_status == EnrichmentStatus.PENDING
        assert task.enriched_text is None

        # Act: Mock Ollama and run enrichment
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Call Mom to discuss weekend plans"

            enrichment_service = EnrichmentService()
            await enrich_task_background(task.id, db_session, enrichment_service)

        # Assert: Verify task is enriched and status updated
        enriched_task = await task_service.get_by_id(task.id)
        assert enriched_task.enrichment_status == EnrichmentStatus.COMPLETED
        assert enriched_task.enriched_text == "Call Mom to discuss weekend plans"
        assert enriched_task.error_message is None

    @pytest.mark.asyncio
    async def test_enrichment_handles_ollama_failure(self, db_session: AsyncSession):
        """Test enrichment failure transitions task to failed status (FR-018)."""
        # Arrange: Create task
        task_service = TaskService(db_session)
        task = await task_service.create("test task")

        # Act: Mock Ollama failure
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.side_effect = Exception("Ollama connection failed")

            enrichment_service = EnrichmentService()
            await enrich_task_background(task.id, db_session, enrichment_service)

        # Assert: Verify task is marked as failed with error message
        failed_task = await task_service.get_by_id(task.id)
        assert failed_task.enrichment_status == EnrichmentStatus.FAILED
        assert failed_task.enriched_text is None
        assert "Ollama connection failed" in failed_task.error_message

    @pytest.mark.asyncio
    async def test_enrichment_processing_status_during_execution(self, db_session: AsyncSession):
        """Test that enrichment_status transitions to processing during execution."""
        # Arrange: Create task
        task_service = TaskService(db_session)
        task = await task_service.create("test task")

        # Act: Mock slow enrichment to capture processing state
        processing_status_captured = False

        async def slow_enrich(user_input: str):
            nonlocal processing_status_captured
            # Check status mid-enrichment
            task_in_progress = await task_service.get_by_id(task.id)
            processing_status_captured = (
                task_in_progress.enrichment_status == EnrichmentStatus.PROCESSING
            )
            return "Enriched: " + user_input

        with patch("src.lib.ollama_client.OllamaClient.enrich_task", side_effect=slow_enrich):
            enrichment_service = EnrichmentService()
            await enrich_task_background(task.id, db_session, enrichment_service)

        # Assert: Verify processing status was set
        assert processing_status_captured

    @pytest.mark.asyncio
    async def test_enrichment_preserves_original_user_input(self, db_session: AsyncSession):
        """Test that original user_input is preserved after enrichment."""
        # Arrange: Create task with original input
        task_service = TaskService(db_session)
        original_input = "fix bug in login screan"  # Intentional typo
        task = await task_service.create(original_input)

        # Act: Mock enrichment
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Fix bug in login screen"

            enrichment_service = EnrichmentService()
            await enrich_task_background(task.id, db_session, enrichment_service)

        # Assert: Verify original input preserved
        enriched_task = await task_service.get_by_id(task.id)
        assert enriched_task.user_input == original_input  # Original with typo
        assert enriched_task.enriched_text == "Fix bug in login screen"  # Fixed

    @pytest.mark.asyncio
    async def test_enrichment_updates_updated_at_timestamp(self, db_session: AsyncSession):
        """Test that updated_at timestamp changes after enrichment."""
        # Arrange: Create task
        task_service = TaskService(db_session)
        task = await task_service.create("test task")
        original_updated_at = task.updated_at

        # Act: Mock enrichment
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Enriched test task"

            enrichment_service = EnrichmentService()
            await enrich_task_background(task.id, db_session, enrichment_service)

        # Assert: Verify updated_at changed
        enriched_task = await task_service.get_by_id(task.id)
        assert enriched_task.updated_at > original_updated_at
