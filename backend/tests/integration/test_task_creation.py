"""Integration tests for task creation with default priority.

Feature 008: Task Management UI Enhancements - User Story 1
Tests verify that tasks created through the full API flow default to "Low" priority.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.task import Task
from src.models.workbench import Workbench


@pytest.mark.asyncio
class TestTaskCreationWithPriority:
    """Test task creation integration with priority defaults."""

    async def test_new_task_defaults_to_low_priority_in_database(
        self, db_session: AsyncSession
    ):
        """Test that new task persists with 'Low' priority when not specified."""
        # Arrange & Act
        task = Task(
            user_input="test task without explicit priority",
            project="General",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert - Task should have "Low" priority in database
        assert task.priority == "Low"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "Low"

    async def test_task_with_explicit_urgent_priority_persists(
        self, db_session: AsyncSession
    ):
        """Test that task with explicit 'Urgent' priority persists correctly."""
        # Arrange & Act
        task = Task(
            user_input="urgent task",
            project="General",
            priority="Urgent",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert
        assert task.priority == "Urgent"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "Urgent"

    async def test_task_with_explicit_high_priority_persists(
        self, db_session: AsyncSession
    ):
        """Test that task with explicit 'High' priority persists correctly."""
        # Arrange & Act
        task = Task(
            user_input="high priority task",
            project="General",
            priority="High",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert
        assert task.priority == "High"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "High"

    async def test_task_with_explicit_normal_priority_persists(
        self, db_session: AsyncSession
    ):
        """Test that task with explicit 'Normal' priority persists correctly."""
        # Arrange & Act
        task = Task(
            user_input="normal priority task",
            project="General",
            priority="Normal",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert
        assert task.priority == "Normal"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "Normal"

    async def test_task_with_explicit_low_priority_persists(
        self, db_session: AsyncSession
    ):
        """Test that task with explicit 'Low' priority persists correctly."""
        # Arrange & Act
        task = Task(
            user_input="low priority task",
            project="General",
            priority="Low",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert
        assert task.priority == "Low"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "Low"

    async def test_task_with_workbench_entry_defaults_to_low_priority(
        self, db_session: AsyncSession
    ):
        """Test that task in workbench workflow defaults to 'Low' priority."""
        # Arrange & Act - Create task with workbench entry
        task = Task(
            user_input="task in workbench",
            project="General",
        )
        db_session.add(task)
        await db_session.flush()  # Get task.id

        workbench = Workbench(
            task_id=task.id,
            enrichment_status="pending",
        )
        db_session.add(workbench)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert - Task should have "Low" priority
        assert task.priority == "Low"

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority == "Low"

    async def test_backward_compatibility_null_priority_in_old_data(
        self, db_session: AsyncSession
    ):
        """Test backward compatibility: old tasks with null priority can be queried."""
        # Arrange - Simulate old data with null priority (before Feature 008)
        task = Task(
            user_input="old task from before priority default feature",
            project="General",
            priority=None,  # Old data without default
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        # Assert - Null priority persists (backward compatibility)
        # UI layer should coalesce null → "Low" for display
        assert task.priority is None

        # Verify database persistence
        result = await db_session.execute(select(Task).where(Task.id == task.id))
        saved_task = result.scalar_one()
        assert saved_task.priority is None
