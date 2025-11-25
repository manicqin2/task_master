"""Integration tests for task retry functionality.

Feature 003: Multi-Lane Task Workflow - Phase 6
Tests verify retry endpoint behavior with enrichment queue.
"""
import pytest
from httpx import AsyncClient


class TestRetryIntegration:
    """Integration tests for retry endpoint."""

    @pytest.mark.asyncio
    async def test_retry_re_enqueues_task(self, client: AsyncClient):
        """T088: Test that retry endpoint re-enqueues task to enrichment queue."""
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test retry enqueue"},
        )
        task_id = create_response.json()["id"]

        # Retry the task
        response = await client.post(f"/api/v1/tasks/{task_id}/retry")
        assert response.status_code == 200

        # Verify task was re-enqueued (status should be pending)
        get_response = await client.get(f"/api/v1/tasks/{task_id}")
        data = get_response.json()
        assert data["enrichment_status"] == "pending"

    @pytest.mark.asyncio
    async def test_retry_resets_status_to_pending(self, client: AsyncClient):
        """T089: Test that retry endpoint resets task status to 'pending'."""
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test status reset"},
        )
        task_id = create_response.json()["id"]

        # Retry the task
        retry_response = await client.post(f"/api/v1/tasks/{task_id}/retry")
        assert retry_response.status_code == 200

        # Verify status is pending
        data = retry_response.json()
        assert data["enrichment_status"] == "pending"

        # Verify error message is cleared
        assert data["error_message"] is None or data["error_message"] == ""

    @pytest.mark.asyncio
    async def test_retry_is_idempotent(self, client: AsyncClient):
        """T090: Test that retry endpoint is idempotent (multiple retries safe)."""
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test idempotency"},
        )
        task_id = create_response.json()["id"]

        # Retry the task multiple times
        response1 = await client.post(f"/api/v1/tasks/{task_id}/retry")
        response2 = await client.post(f"/api/v1/tasks/{task_id}/retry")
        response3 = await client.post(f"/api/v1/tasks/{task_id}/retry")

        # All retries should succeed
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response3.status_code == 200

        # Task should still be in valid state
        get_response = await client.get(f"/api/v1/tasks/{task_id}")
        data = get_response.json()
        assert data["enrichment_status"] in ["pending", "processing", "completed", "failed"]
        assert data["id"] == task_id

    @pytest.mark.asyncio
    async def test_retry_clears_error_message(self, client: AsyncClient):
        """Test that retry clears previous error message."""
        # Create a task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test error clearing"},
        )
        task_id = create_response.json()["id"]

        # Retry the task
        retry_response = await client.post(f"/api/v1/tasks/{task_id}/retry")
        data = retry_response.json()

        # Error message should be cleared
        assert data["error_message"] is None or data["error_message"] == ""
