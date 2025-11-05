"""Integration tests for async task submission.

Tests verify async processing requirements (FR-013 to FR-019):
- Multiple tasks can be submitted without blocking
- Tasks process independently in background
- Each task updates individually as enrichment completes
- Failed enrichment doesn't affect other tasks
"""
import asyncio
import pytest
from unittest.mock import patch
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import EnrichmentStatus
from src.services.task_service import TaskService
from src.services.enrichment_service import EnrichmentService
from src.services.task_queue import enrich_task_background


class TestAsyncTaskSubmission:
    """Test async task processing and independence."""

    @pytest.mark.asyncio
    async def test_submit_5_tasks_rapidly_all_complete_independently(
        self, db_session: AsyncSession
    ):
        """Test that 5 rapidly submitted tasks all complete independently (SC-008)."""
        # Arrange: Create task service
        task_service = TaskService(db_session)

        # Mock enrichment with varying delays to simulate real async behavior
        async def mock_enrich_with_delay(user_input: str):
            await asyncio.sleep(0.1)  # Simulate network delay
            return f"Enriched: {user_input}"

        # Act: Submit 5 tasks rapidly
        task_ids = []
        for i in range(5):
            task = await task_service.create(f"task {i+1}")
            task_ids.append(task.id)

        # Start enrichment for all tasks concurrently
        with patch(
            "src.lib.ollama_client.OllamaClient.enrich_task",
            side_effect=mock_enrich_with_delay,
        ):
            enrichment_service = EnrichmentService()

            # Run all enrichments concurrently
            enrichment_tasks = [
                enrich_task_background(task_id, db_session, enrichment_service)
                for task_id in task_ids
            ]
            await asyncio.gather(*enrichment_tasks)

        # Assert: Verify all 5 tasks completed
        for task_id in task_ids:
            task = await task_service.get_by_id(task_id)
            assert task.enrichment_status == EnrichmentStatus.COMPLETED
            assert task.enriched_text is not None
            assert task.error_message is None

    @pytest.mark.asyncio
    async def test_failed_enrichment_does_not_affect_other_tasks(
        self, db_session: AsyncSession
    ):
        """Test that one failed enrichment doesn't affect other tasks (FR-018)."""
        # Arrange: Create task service
        task_service = TaskService(db_session)

        # Create 3 tasks
        task1 = await task_service.create("task 1")
        task2 = await task_service.create("task 2")  # This will fail
        task3 = await task_service.create("task 3")

        # Mock enrichment - fail task 2, succeed others
        def mock_enrich_selective(user_input: str):
            if "task 2" in user_input:
                raise Exception("Enrichment failed for task 2")
            return f"Enriched: {user_input}"

        # Act: Run all enrichments
        with patch(
            "src.lib.ollama_client.OllamaClient.enrich_task",
            side_effect=mock_enrich_selective,
        ):
            enrichment_service = EnrichmentService()

            # Run all enrichments (don't raise exceptions)
            await asyncio.gather(
                enrich_task_background(task1.id, db_session, enrichment_service),
                enrich_task_background(task2.id, db_session, enrichment_service),
                enrich_task_background(task3.id, db_session, enrichment_service),
                return_exceptions=True,
            )

        # Assert: Tasks 1 and 3 succeeded, task 2 failed
        task1_result = await task_service.get_by_id(task1.id)
        assert task1_result.enrichment_status == EnrichmentStatus.COMPLETED

        task2_result = await task_service.get_by_id(task2.id)
        assert task2_result.enrichment_status == EnrichmentStatus.FAILED
        assert "failed for task 2" in task2_result.error_message

        task3_result = await task_service.get_by_id(task3.id)
        assert task3_result.enrichment_status == EnrichmentStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_tasks_update_individually_as_enrichment_completes(
        self, db_session: AsyncSession
    ):
        """Test that tasks update individually, not in batch (FR-016)."""
        # Arrange: Create 3 tasks
        task_service = TaskService(db_session)
        task1 = await task_service.create("fast task")
        task2 = await task_service.create("slow task")
        task3 = await task_service.create("medium task")

        # Mock enrichment with different delays
        async def mock_enrich_variable_delay(user_input: str):
            if "fast" in user_input:
                await asyncio.sleep(0.05)
            elif "slow" in user_input:
                await asyncio.sleep(0.2)
            elif "medium" in user_input:
                await asyncio.sleep(0.1)
            return f"Enriched: {user_input}"

        # Act: Start all enrichments
        with patch(
            "src.lib.ollama_client.OllamaClient.enrich_task",
            side_effect=mock_enrich_variable_delay,
        ):
            enrichment_service = EnrichmentService()

            # Start all enrichments concurrently
            enrichments = [
                asyncio.create_task(
                    enrich_task_background(task1.id, db_session, enrichment_service)
                ),
                asyncio.create_task(
                    enrich_task_background(task2.id, db_session, enrichment_service)
                ),
                asyncio.create_task(
                    enrich_task_background(task3.id, db_session, enrichment_service)
                ),
            ]

            # Wait for fast task to complete first
            await asyncio.sleep(0.08)

            # Assert: Fast task should be complete, others still processing or pending
            task1_mid = await task_service.get_by_id(task1.id)
            task2_mid = await task_service.get_by_id(task2.id)

            assert task1_mid.enrichment_status == EnrichmentStatus.COMPLETED
            # Task 2 should still be processing (or pending if not started yet)
            assert task2_mid.enrichment_status in [
                EnrichmentStatus.PROCESSING,
                EnrichmentStatus.PENDING,
            ]

            # Wait for all to complete
            await asyncio.gather(*enrichments)

            # Verify all eventually complete
            task2_final = await task_service.get_by_id(task2.id)
            assert task2_final.enrichment_status == EnrichmentStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_enrichment_maintains_submission_order_in_database(
        self, db_session: AsyncSession
    ):
        """Test that tasks maintain submission order even if enriched out of order (FR-017)."""
        # Arrange: Create 3 tasks
        task_service = TaskService(db_session)
        task1 = await task_service.create("task 1")
        task2 = await task_service.create("task 2")
        task3 = await task_service.create("task 3")

        # Note their created_at timestamps
        assert task1.created_at < task2.created_at < task3.created_at

        # Act: Enrich in reverse order (3, 2, 1)
        with patch("src.lib.ollama_client.OllamaClient.enrich_task") as mock_enrich:
            mock_enrich.return_value = "Enriched"

            enrichment_service = EnrichmentService()
            await enrich_task_background(task3.id, db_session, enrichment_service)
            await enrich_task_background(task2.id, db_session, enrichment_service)
            await enrich_task_background(task1.id, db_session, enrichment_service)

        # Assert: created_at order is preserved (task list will show 3, 2, 1)
        tasks = await task_service.list()
        assert tasks[0].id == task3.id  # Newest first
        assert tasks[1].id == task2.id
        assert tasks[2].id == task1.id
