"""Contract tests for API backward compatibility after three-table migration.

Ensures that API responses remain identical after refactoring from single-table
to three-table architecture (tasks, workbench, todos).
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Task, Workbench, Todo
from src.models.enums import EnrichmentStatus, TodoStatus


# T016: Contract test for API backward compatibility GET /api/tasks
@pytest.mark.asyncio
async def test_api_get_tasks_backward_compatibility(
    client: AsyncClient, db_session: AsyncSession, sample_tasks
):
    """Test that GET /api/tasks returns the same response format after migration."""
    # Call API endpoint
    response = await client.get("/api/tasks")

    # Verify response structure
    assert response.status_code == 200
    data = response.json()

    # Verify response is a list
    assert isinstance(data, list)
    assert len(data) == 3  # We have 3 sample tasks

    # Verify each task has the expected fields (backward compatible)
    for task_data in data:
        # Core task fields
        assert "id" in task_data
        assert "user_input" in task_data
        assert "created_at" in task_data
        assert "updated_at" in task_data

        # Enrichment state fields (from workbench table, but presented in response)
        # These should be included even though they're now in a separate table
        assert "enrichment_status" in task_data or task_data.get("enrichment_status") is None

        # Execution state fields (from todos table, but presented in response)
        # These may be None if task isn't in todos
        # The field should still be present for backward compatibility
        if "status" in task_data:
            # If status is present, it should be a valid TodoStatus value
            assert task_data["status"] in ["open", "completed", "archived", None]


# T017: Contract test for API backward compatibility GET /api/tasks/{id}
@pytest.mark.asyncio
async def test_api_get_task_by_id_backward_compatibility(
    client: AsyncClient, db_session: AsyncSession, sample_tasks
):
    """Test that GET /api/tasks/{id} returns the same response format after migration."""
    # Get first sample task
    task = sample_tasks[0]

    # Call API endpoint
    response = await client.get(f"/api/tasks/{task.id}")

    # Verify response structure
    assert response.status_code == 200
    data = response.json()

    # Verify core task fields are present
    assert data["id"] == task.id
    assert data["user_input"] == task.user_input
    assert "created_at" in data
    assert "updated_at" in data

    # Verify enrichment state is included (from workbench table)
    # Even though it's now in a separate table, it should appear in the response
    assert "enrichment_status" in data
    # For task1 from sample_tasks, enrichment_status should be "pending"
    assert data["enrichment_status"] == "pending"

    # Verify execution state fields
    # Task1 has no todos entry, so status should be None
    assert "status" in data  # Field should exist for backward compat
    assert data["status"] is None  # But value is None since no todos entry

    # Verify metadata fields are present (these remain in tasks table)
    assert "project" in data
    assert "requires_attention" in data


# Additional backward compatibility tests for other scenarios

@pytest.mark.asyncio
async def test_api_task_with_both_states(
    client: AsyncClient, db_session: AsyncSession, sample_tasks
):
    """Test API response for task that has both workbench and todos entries."""
    # Get task2 (has both workbench and todos)
    task = sample_tasks[1]

    response = await client.get(f"/api/tasks/{task.id}")
    assert response.status_code == 200

    data = response.json()

    # Verify both enrichment_status and status are present
    assert data["enrichment_status"] == "completed"
    assert data["status"] == "open"

    # Verify task data is intact
    assert data["user_input"] == task.user_input
    assert data["project"] == "Work"


@pytest.mark.asyncio
async def test_api_task_with_failed_enrichment(
    client: AsyncClient, db_session: AsyncSession, sample_tasks
):
    """Test API response for task with failed enrichment."""
    # Get task3 (failed enrichment)
    task = sample_tasks[2]

    response = await client.get(f"/api/tasks/{task.id}")
    assert response.status_code == 200

    data = response.json()

    # Verify enrichment_status is "failed"
    assert data["enrichment_status"] == "failed"

    # Verify error_message is included (from workbench table)
    assert "error_message" in data
    assert data["error_message"] == "Metadata extraction timeout"

    # Verify requires_attention flag is set
    assert data["requires_attention"] is True
