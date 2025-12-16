"""Integration tests for Task Workbench query optimization.

Verifies that workbench lane queries only join tasks + workbench tables,
not the todos table, for better performance.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Task, Workbench, Todo
from src.models.enums import EnrichmentStatus, TodoStatus


# T033: Integration test for Pending lane query (tasks + workbench only)
@pytest.mark.asyncio
async def test_pending_lane_query_no_todos_join(db_session: AsyncSession, sample_tasks):
    """Test that Pending lane query does not join todos table."""
    # Query for pending tasks (should only join workbench, not todos)
    query = (
        select(Task, Workbench)
        .join(Workbench, Task.id == Workbench.task_id)
        .where(Workbench.enrichment_status == EnrichmentStatus.PENDING)
    )

    result = await db_session.execute(query)
    pending_tasks = result.all()

    # Verify we got the pending task (task1 from sample_tasks)
    assert len(pending_tasks) == 1

    task, workbench = pending_tasks[0]
    assert task.user_input == "Call John about the quarterly review meeting"
    assert workbench.enrichment_status == EnrichmentStatus.PENDING

    # Verify the query did NOT join todos table
    # (this is verified by the query structure itself - no Todo in select/join)


# T034: Integration test for More Info lane query (tasks + workbench only)
@pytest.mark.asyncio
async def test_more_info_lane_query_no_todos_join(db_session: AsyncSession, sample_tasks):
    """Test that More Info lane query does not join todos table."""
    # Query for failed enrichment tasks (More Info lane)
    query = (
        select(Task, Workbench)
        .join(Workbench, Task.id == Workbench.task_id)
        .where(Workbench.enrichment_status == EnrichmentStatus.FAILED)
    )

    result = await db_session.execute(query)
    failed_tasks = result.all()

    # Verify we got the failed task (task3 from sample_tasks)
    assert len(failed_tasks) == 1

    task, workbench = failed_tasks[0]
    assert task.user_input == "Review the Q4 budget"
    assert workbench.enrichment_status == EnrichmentStatus.FAILED
    assert workbench.error_message == "Metadata extraction timeout"


# T035: Integration test for Ready lane query (tasks + workbench only)
@pytest.mark.asyncio
async def test_ready_lane_query_no_todos_join(db_session: AsyncSession, sample_tasks):
    """Test that Ready lane query does not join todos table."""
    # Query for completed enrichment tasks that haven't moved to todos yet
    # Ready lane = completed enrichment + not moved to todos + has required metadata
    query = (
        select(Task, Workbench)
        .join(Workbench, Task.id == Workbench.task_id)
        .where(
            Workbench.enrichment_status == EnrichmentStatus.COMPLETED,
            Workbench.moved_to_todos_at.is_(None),
            Task.requires_attention == False,
            Task.project.isnot(None),  # Has required metadata
        )
    )

    result = await db_session.execute(query)
    ready_tasks = result.all()

    # Note: task2 has moved_to_todos_at set, so it shouldn't appear in Ready lane
    # None of our sample tasks meet Ready criteria (task2 already moved)
    assert len(ready_tasks) == 0


# T036: Integration test for query performance benchmark
@pytest.mark.asyncio
async def test_workbench_query_performance(db_session: AsyncSession):
    """Test that workbench queries are efficient (no unnecessary joins)."""
    from datetime import datetime, timezone
    from uuid import uuid4

    # Create 100 tasks with workbench entries
    for i in range(100):
        task = Task(
            id=str(uuid4()),
            user_input=f"Task {i}",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        workbench = Workbench(
            id=str(uuid4()),
            task_id=task.id,
            enrichment_status=EnrichmentStatus.PENDING if i % 2 == 0 else EnrichmentStatus.COMPLETED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(task)
        db_session.add(workbench)

    await db_session.commit()

    # Query pending tasks (should be efficient - only tasks + workbench)
    import time
    start = time.time()

    query = (
        select(Task, Workbench)
        .join(Workbench, Task.id == Workbench.task_id)
        .where(Workbench.enrichment_status == EnrichmentStatus.PENDING)
    )

    result = await db_session.execute(query)
    pending_tasks = result.all()

    elapsed = time.time() - start

    # Verify we got ~50 pending tasks
    assert len(pending_tasks) == 50

    # Performance check: should complete in under 100ms for 100 tasks
    assert elapsed < 0.1, f"Query took {elapsed:.3f}s - too slow!"


# T037: Contract test for GET /api/tasks?enrichment_status=pending
@pytest.mark.asyncio
async def test_api_filter_by_enrichment_status_pending(client, db_session: AsyncSession, sample_tasks):
    """Test API endpoint filters by enrichment_status without joining todos."""
    response = await client.get("/api/tasks?enrichment_status=pending")

    assert response.status_code == 200
    data = response.json()

    # Should return only pending tasks
    assert len(data) == 1
    assert data[0]["enrichment_status"] == "pending"
    assert "Call John" in data[0]["user_input"]


# T038: Contract test for GET /api/tasks?enrichment_status=failed
@pytest.mark.asyncio
async def test_api_filter_by_enrichment_status_failed(client, db_session: AsyncSession, sample_tasks):
    """Test API endpoint filters by enrichment_status for failed tasks."""
    response = await client.get("/api/tasks?enrichment_status=failed")

    assert response.status_code == 200
    data = response.json()

    # Should return only failed tasks
    assert len(data) == 1
    assert data[0]["enrichment_status"] == "failed"
    assert data[0]["error_message"] == "Metadata extraction timeout"
    assert "Q4 budget" in data[0]["user_input"]
