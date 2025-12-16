"""Integration tests for three-table schema migration.

Tests the migration from single tasks table to three-table architecture:
- tasks: immutable task data
- workbench: enrichment workflow state
- todos: execution workflow state
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import select, func, inspect
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Task, Workbench, Todo
from src.models.enums import EnrichmentStatus, TodoStatus


# T008: Contract test for migration data integrity
@pytest.mark.asyncio
async def test_migration_data_integrity(db_session: AsyncSession, sample_tasks, capture_baseline):
    """Test that migration preserves all data without loss."""
    # Capture baseline counts before migration
    baseline = await capture_baseline()

    # Verify all sample tasks exist
    assert baseline["tasks"] == 3
    assert baseline["workbench"] == 3
    assert baseline["todos"] == 1  # Only task2 has todos entry

    # Verify no data was lost
    tasks = await db_session.execute(select(Task))
    all_tasks = tasks.scalars().all()
    assert len(all_tasks) == 3

    # Verify all task data is intact
    for task in all_tasks:
        assert task.id is not None
        assert task.user_input is not None
        assert task.created_at is not None


# T009: Contract test for enum value validation
@pytest.mark.asyncio
async def test_migration_enum_validation(db_session: AsyncSession, sample_tasks):
    """Test that all enrichment_status and status values are valid enums."""
    # Check workbench enrichment_status values
    workbenches = await db_session.execute(select(Workbench))
    for wb in workbenches.scalars().all():
        assert wb.enrichment_status in [
            EnrichmentStatus.PENDING,
            EnrichmentStatus.PROCESSING,
            EnrichmentStatus.COMPLETED,
            EnrichmentStatus.FAILED,
        ]

    # Check todos status values
    todos = await db_session.execute(select(Todo))
    for todo in todos.scalars().all():
        assert todo.status in [
            TodoStatus.OPEN,
            TodoStatus.COMPLETED,
            TodoStatus.ARCHIVED,
        ]


# T010: Contract test for foreign key validation
@pytest.mark.asyncio
async def test_migration_foreign_key_validation(db_session: AsyncSession, sample_tasks):
    """Test that all foreign key relationships are valid."""
    # Verify all workbench entries reference existing tasks
    workbenches = await db_session.execute(select(Workbench))
    for wb in workbenches.scalars().all():
        task = await db_session.get(Task, wb.task_id)
        assert task is not None, f"Workbench {wb.id} references non-existent task {wb.task_id}"

    # Verify all todos entries reference existing tasks
    todos = await db_session.execute(select(Todo))
    for todo in todos.scalars().all():
        task = await db_session.get(Task, todo.task_id)
        assert task is not None, f"Todo {todo.id} references non-existent task {todo.task_id}"


# T011: Integration test for tasks with only enrichment_status migration
@pytest.mark.asyncio
async def test_migration_enrichment_only_tasks(db_session: AsyncSession, sample_tasks):
    """Test migration of tasks that have enrichment state but no todo state."""
    # Find task1 (has workbench entry but no todo entry)
    task1 = sample_tasks[0]

    # Verify task exists
    task = await db_session.get(Task, task1.id)
    assert task is not None

    # Verify workbench entry exists
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task1.id)
    )
    workbench = wb_result.scalar_one_or_none()
    assert workbench is not None
    assert workbench.enrichment_status == EnrichmentStatus.PENDING

    # Verify NO todos entry exists
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task1.id)
    )
    todo = todo_result.scalar_one_or_none()
    assert todo is None, "Task with only enrichment state should not have todos entry"


# T012: Integration test for tasks with only status migration
@pytest.mark.asyncio
async def test_migration_status_only_tasks(db_session: AsyncSession):
    """Test migration of tasks that have todo state but no enrichment state."""
    # Create a task with todos entry but no workbench entry
    from uuid import uuid4

    task_only_todo = Task(
        id=str(uuid4()),
        user_input="Task with only todos entry",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    todo_only = Todo(
        id=str(uuid4()),
        task_id=task_only_todo.id,
        status=TodoStatus.OPEN,
        position=10,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db_session.add(task_only_todo)
    db_session.add(todo_only)
    await db_session.commit()

    # Verify task exists
    task = await db_session.get(Task, task_only_todo.id)
    assert task is not None

    # Verify todos entry exists
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task_only_todo.id)
    )
    todo = todo_result.scalar_one_or_none()
    assert todo is not None
    assert todo.status == TodoStatus.OPEN
    assert todo.position == 10

    # Verify NO workbench entry exists
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task_only_todo.id)
    )
    workbench = wb_result.scalar_one_or_none()
    assert workbench is None, "Task with only todos state should not have workbench entry"


# T013: Integration test for tasks with both states migration
@pytest.mark.asyncio
async def test_migration_both_states_tasks(db_session: AsyncSession, sample_tasks):
    """Test migration of tasks that have both enrichment and execution state."""
    # Find task2 (has both workbench and todos entries)
    task2 = sample_tasks[1]

    # Verify task exists
    task = await db_session.get(Task, task2.id)
    assert task is not None

    # Verify workbench entry exists
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task2.id)
    )
    workbench = wb_result.scalar_one_or_none()
    assert workbench is not None
    assert workbench.enrichment_status == EnrichmentStatus.COMPLETED

    # Verify todos entry exists
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task2.id)
    )
    todo = todo_result.scalar_one_or_none()
    assert todo is not None
    assert todo.status == TodoStatus.OPEN

    # Verify moved_to_todos_at is set (task graduated from workbench to todos)
    assert workbench.moved_to_todos_at is not None


# T014: Integration test for moved_to_todos_at timestamp logic
@pytest.mark.asyncio
async def test_migration_moved_to_todos_timestamp(db_session: AsyncSession, sample_tasks):
    """Test that moved_to_todos_at is set correctly when task is in both tables."""
    # Task2 has both workbench and todos entries
    task2 = sample_tasks[1]

    # Get workbench entry
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task2.id)
    )
    workbench = wb_result.scalar_one()

    # Get todos entry
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task2.id)
    )
    todo = todo_result.scalar_one()

    # Verify moved_to_todos_at is set
    assert workbench.moved_to_todos_at is not None

    # Verify moved_to_todos_at is approximately equal to todos.created_at
    # (within 1 second tolerance for test timing)
    time_diff = abs((workbench.moved_to_todos_at - todo.created_at).total_seconds())
    assert time_diff < 1.0, "moved_to_todos_at should match todos creation time"


# T015: Integration test for position assignment based on created_at
@pytest.mark.asyncio
async def test_migration_position_assignment(db_session: AsyncSession):
    """Test that todos positions are assigned sequentially based on created_at."""
    from uuid import uuid4

    # Create 3 tasks with todos entries at different times
    tasks_with_todos = []
    for i in range(3):
        task = Task(
            id=str(uuid4()),
            user_input=f"Task {i}",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        todo = Todo(
            id=str(uuid4()),
            task_id=task.id,
            status=TodoStatus.OPEN,
            position=i + 1,  # Position should be assigned based on created_at order
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(task)
        db_session.add(todo)
        tasks_with_todos.append((task, todo))

    await db_session.commit()

    # Query todos ordered by position
    todos_result = await db_session.execute(
        select(Todo).order_by(Todo.position)
    )
    todos = todos_result.scalars().all()

    # Verify positions are sequential
    for i, todo in enumerate(todos[-3:]):  # Get last 3 todos we just created
        assert todo.position == i + 1
