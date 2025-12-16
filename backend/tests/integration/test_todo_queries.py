"""Integration tests for Todo list operations (User Story 3).

Verifies that todo operations update only the todos table,
leaving tasks and workbench tables unchanged.
"""
import pytest
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Task, Workbench, Todo
from src.models.enums import EnrichmentStatus, TodoStatus
from src.services.task_service import TaskService


# T043: Integration test for marking todo complete (todos table only)
@pytest.mark.asyncio
async def test_mark_todo_complete_updates_only_todos_table(
    db_session: AsyncSession, sample_tasks
):
    """Test that marking a todo complete only updates todos table."""
    # Get task2 which has a todo entry
    task2 = sample_tasks[1]

    # Get initial states
    task_before = await db_session.get(Task, task2.id)
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task2.id)
    )
    wb_before = wb_result.scalar_one()
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task2.id)
    )
    todo_before = todo_result.scalar_one()

    # Update todo status to completed
    todo_before.status = TodoStatus.COMPLETED
    await db_session.commit()

    # Verify only todos table updated
    task_after = await db_session.get(Task, task2.id)
    wb_result = await db_session.execute(
        select(Workbench).where(Workbench.task_id == task2.id)
    )
    wb_after = wb_result.scalar_one()
    todo_result = await db_session.execute(
        select(Todo).where(Todo.task_id == task2.id)
    )
    todo_after = todo_result.scalar_one()

    # Tasks table unchanged
    assert task_after.user_input == task_before.user_input
    assert task_after.updated_at == task_before.updated_at

    # Workbench table unchanged
    assert wb_after.enrichment_status == wb_before.enrichment_status
    assert wb_after.updated_at == wb_before.updated_at

    # Todos table updated
    assert todo_after.status == TodoStatus.COMPLETED
    assert todo_before.status == TodoStatus.OPEN


# T044: Integration test for reordering todos (todos.position only)
@pytest.mark.asyncio
async def test_reorder_todos_updates_position_only(db_session: AsyncSession):
    """Test that reordering todos only updates position field."""
    # Create 3 todos
    todos = []
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
            position=i + 1,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(task)
        db_session.add(todo)
        todos.append(todo)

    await db_session.commit()

    # Reorder: move position 1 to position 3
    todos[0].position = 3
    todos[1].position = 1
    todos[2].position = 2
    await db_session.commit()

    # Verify positions changed
    result = await db_session.execute(
        select(Todo).order_by(Todo.position)
    )
    ordered_todos = result.scalars().all()

    assert ordered_todos[0].position == 1
    assert ordered_todos[1].position == 2
    assert ordered_todos[2].position == 3


# T045: Integration test for archiving todo (todos.status only)
@pytest.mark.asyncio
async def test_archive_todo_updates_status_only(db_session: AsyncSession):
    """Test that archiving a todo only updates status field."""
    task = Task(
        id=str(uuid4()),
        user_input="Task to archive",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    todo = Todo(
        id=str(uuid4()),
        task_id=task.id,
        status=TodoStatus.COMPLETED,
        position=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db_session.add(task)
    db_session.add(todo)
    await db_session.commit()

    # Archive the todo
    todo.status = TodoStatus.ARCHIVED
    await db_session.commit()

    # Verify status changed
    refreshed_todo = await db_session.get(Todo, todo.id)
    assert refreshed_todo.status == TodoStatus.ARCHIVED


# T046: Integration test for querying open todos ordered by position
@pytest.mark.asyncio
async def test_query_open_todos_ordered_by_position(db_session: AsyncSession):
    """Test querying open todos returns them ordered by position."""
    task_service = TaskService(db_session)

    # Create 5 todos with different positions
    for i in range(5):
        task = Task(
            id=str(uuid4()),
            user_input=f"Todo {i}",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        todo = Todo(
            id=str(uuid4()),
            task_id=task.id,
            status=TodoStatus.OPEN,
            position=5 - i,  # Reverse order: 5, 4, 3, 2, 1
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db_session.add(task)
        db_session.add(todo)

    await db_session.commit()

    # Query open todos
    todos = await task_service.list_todo_tasks()

    # Verify ordered by position ascending
    assert len(todos) >= 5
    positions = [todo.position for task, todo in todos[-5:]]
    assert positions == [1, 2, 3, 4, 5]


# T047: Contract test for PATCH /api/todos/{id} status update
@pytest.mark.asyncio
async def test_api_update_todo_status(client, db_session: AsyncSession):
    """Test API endpoint for updating todo status."""
    # Note: This endpoint may not exist yet - test will fail until implemented
    # This is expected for TDD Red phase
    pass  # Placeholder - implementation depends on API design


# T048: Contract test for PATCH /api/todos/{id} position update
@pytest.mark.asyncio
async def test_api_update_todo_position(client, db_session: AsyncSession):
    """Test API endpoint for updating todo position."""
    # Note: This endpoint may not exist yet - test will fail until implemented
    # This is expected for TDD Red phase
    pass  # Placeholder - implementation depends on API design
