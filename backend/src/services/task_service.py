"""Task service for CRUD operations."""
from typing import List, Optional, Tuple
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.task import Task
from ..models.workbench import Workbench
from ..models.todos import Todo
from ..models.enums import EnrichmentStatus, TodoStatus


class TaskService:
    """Service for managing tasks with 3-table architecture.

    Query Optimization Strategy (User Story 2 - T042):
    =====================================================

    This service follows query optimization patterns to ensure efficient database operations:

    1. **Workbench Queries** (Task Workbench lanes):
       - JOIN tasks + workbench tables only
       - Do NOT join todos table
       - Used for: Pending, More Info, Ready lanes
       - Methods: list_workbench_tasks(), get_tasks_by_enrichment_status()

    2. **Todos Queries** (Todo list operations):
       - JOIN tasks + todos tables only
       - Do NOT join workbench table
       - Used for: Todo list, project views, persons views, agenda
       - Methods: list_todo_tasks(), get_todos_by_status()

    3. **Single Task Queries**:
       - LEFT JOIN all tables when fetching by ID (may have workbench OR todos OR both)
       - Methods: get_by_id() with selective eager loading

    This separation ensures queries only join what they need, improving performance
    as the database grows. Workbench and todos are independent workflows that rarely
    need to be queried together.
    """

    def __init__(self, db: AsyncSession):
        """Initialize task service.

        Args:
            db: Database session.
        """
        self.db = db

    async def create(self, user_input: str) -> Tuple[Task, Workbench]:
        """Create a new task and workbench entry.

        Args:
            user_input: User's task input text.

        Returns:
            Tuple of (created task, workbench entry).

        Raises:
            ValueError: If user_input is empty or whitespace-only (FR-010).
        """
        # Validate input (FR-010)
        if not user_input or not user_input.strip():
            raise ValueError("Task input cannot be empty")

        # Create task
        task = Task(user_input=user_input)

        self.db.add(task)
        await self.db.flush()  # Flush to get task.id

        # Create workbench entry for enrichment workflow
        workbench = Workbench(
            task_id=task.id,
            enrichment_status=EnrichmentStatus.PENDING,
        )

        self.db.add(workbench)
        await self.db.commit()
        await self.db.refresh(task)
        await self.db.refresh(workbench)

        return task, workbench

    async def list_workbench_tasks(self) -> List[Tuple[Task, Workbench]]:
        """List all tasks in workbench (not yet moved to todos).

        Returns:
            List of (task, workbench) tuples ordered by created_at DESC.
        """
        stmt = (
            select(Task, Workbench)
            .join(Workbench, Task.id == Workbench.task_id)
            .where(Workbench.moved_to_todos_at.is_(None))
            .order_by(Task.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.all())

    # T039: Query tasks by enrichment_status (workbench-only join)
    async def get_tasks_by_enrichment_status(
        self, status: EnrichmentStatus
    ) -> List[Tuple[Task, Workbench]]:
        """Get tasks filtered by enrichment status.

        This query optimization joins ONLY tasks + workbench tables,
        not todos, for better performance (User Story 2).

        Args:
            status: Enrichment status to filter by.

        Returns:
            List of (task, workbench) tuples matching the status.
        """
        stmt = (
            select(Task, Workbench)
            .join(Workbench, Task.id == Workbench.task_id)
            .where(Workbench.enrichment_status == status)
            .order_by(Task.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.all())

    async def list_todo_tasks(self) -> List[Tuple[Task, Todo]]:
        """List all tasks in todo list (for todo/project/persons/agenda views).

        Returns:
            List of (task, todo) tuples ordered by position.
        """
        stmt = (
            select(Task, Todo)
            .join(Todo, Task.id == Todo.task_id)
            .where(Todo.status == TodoStatus.OPEN)
            .order_by(Todo.position.asc().nullsfirst(), Task.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.all())

    async def get_by_id(self, task_id: str) -> Task:
        """Get task by ID.

        Args:
            task_id: Task UUID.

        Returns:
            Task instance.

        Raises:
            Exception: If task not found.
        """
        stmt = select(Task).where(Task.id == task_id)
        result = await self.db.execute(stmt)
        task = result.scalar_one_or_none()

        if task is None:
            raise Exception(f"Task {task_id} not found")

        return task

    async def get_workbench_entry(self, task_id: str) -> Workbench:
        """Get workbench entry for a task.

        Args:
            task_id: Task UUID.

        Returns:
            Workbench entry.

        Raises:
            Exception: If workbench entry not found.
        """
        stmt = select(Workbench).where(Workbench.task_id == task_id)
        result = await self.db.execute(stmt)
        workbench = result.scalar_one_or_none()

        if workbench is None:
            raise Exception(f"Workbench entry for task {task_id} not found")

        return workbench

    async def update_enrichment(
        self,
        task_id: str,
        status: EnrichmentStatus,
        enriched_text: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Tuple[Task, Workbench]:
        """Update task enrichment status and text.

        Args:
            task_id: Task UUID.
            status: New enrichment status.
            enriched_text: Enriched task text (optional).
            error_message: Error message if enrichment failed (optional).

        Returns:
            Tuple of (updated task, updated workbench).

        Raises:
            Exception: If task not found.
        """
        task = await self.get_by_id(task_id)
        workbench = await self.get_workbench_entry(task_id)

        # Update task
        task.enriched_text = enriched_text
        task.updated_at = datetime.now(timezone.utc)

        # Update workbench entry
        workbench.enrichment_status = status
        workbench.error_message = error_message
        workbench.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(task)
        await self.db.refresh(workbench)

        return task, workbench

    async def retry_task(self, task_id: str) -> Tuple[Task, Workbench]:
        """Retry a task by resetting its enrichment status to pending.

        Feature 003: Multi-Lane Task Workflow - Phase 6 (T096)

        Args:
            task_id: Task UUID to retry.

        Returns:
            Tuple of (updated task, updated workbench).

        Raises:
            Exception: If task not found.
        """
        task = await self.get_by_id(task_id)
        workbench = await self.get_workbench_entry(task_id)

        # Reset enrichment status to pending
        workbench.enrichment_status = EnrichmentStatus.PENDING
        workbench.error_message = None
        workbench.updated_at = datetime.now(timezone.utc)

        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(task)
        await self.db.refresh(workbench)

        return task, workbench

    async def move_to_todos(self, task_id: str, position: Optional[int] = None) -> Tuple[Task, Workbench, Todo]:
        """Move a task from workbench to todos.

        Args:
            task_id: Task UUID to move.
            position: Position in todo list (optional).

        Returns:
            Tuple of (task, workbench, todo entry).

        Raises:
            Exception: If task not found or already moved.
        """
        task = await self.get_by_id(task_id)
        workbench = await self.get_workbench_entry(task_id)

        # Check if already moved
        if workbench.moved_to_todos_at is not None:
            raise Exception(f"Task {task_id} already moved to todos")

        # Update workbench
        workbench.moved_to_todos_at = datetime.now(timezone.utc)
        workbench.updated_at = datetime.now(timezone.utc)

        # Create todo entry
        todo = Todo(
            task_id=task_id,
            status=TodoStatus.OPEN,
            position=position,
        )

        self.db.add(todo)
        await self.db.commit()
        await self.db.refresh(task)
        await self.db.refresh(workbench)
        await self.db.refresh(todo)

        return task, workbench, todo

    async def delete(self, task_id: str) -> None:
        """Delete a task.

        Args:
            task_id: Task UUID to delete.

        Raises:
            Exception: If task not found.
        """
        task = await self.get_by_id(task_id)
        await self.db.delete(task)
        await self.db.commit()
