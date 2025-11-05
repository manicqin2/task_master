"""Task service for CRUD operations."""
from typing import List, Optional
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.task import Task
from ..models.enums import EnrichmentStatus, TaskStatus


class TaskService:
    """Service for managing tasks."""

    def __init__(self, db: AsyncSession):
        """Initialize task service.

        Args:
            db: Database session.
        """
        self.db = db

    async def create(self, user_input: str) -> Task:
        """Create a new task.

        Args:
            user_input: User's task input text.

        Returns:
            Created task with pending enrichment status.

        Raises:
            ValueError: If user_input is empty or whitespace-only (FR-010).
        """
        # Validate input (FR-010)
        if not user_input or not user_input.strip():
            raise ValueError("Task input cannot be empty")

        # Create task
        task = Task(
            user_input=user_input,
            status=TaskStatus.OPEN,
            enrichment_status=EnrichmentStatus.PENDING,
        )

        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)

        return task

    async def list(self) -> List[Task]:
        """List all tasks in reverse chronological order.

        Returns:
            List of tasks ordered by created_at DESC (FR-007).
        """
        stmt = select(Task).order_by(Task.created_at.desc())
        result = await self.db.execute(stmt)
        tasks = result.scalars().all()
        return list(tasks)

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

    async def update_enrichment(
        self,
        task_id: str,
        status: EnrichmentStatus,
        enriched_text: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Task:
        """Update task enrichment status and text.

        Args:
            task_id: Task UUID.
            status: New enrichment status.
            enriched_text: Enriched task text (optional).
            error_message: Error message if enrichment failed (optional).

        Returns:
            Updated task.

        Raises:
            Exception: If task not found.
        """
        task = await self.get_by_id(task_id)

        task.enrichment_status = status
        task.enriched_text = enriched_text
        task.error_message = error_message
        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(task)

        return task

    async def retry_task(self, task_id: str) -> Task:
        """Retry a task by resetting its enrichment status to pending.

        Feature 003: Multi-Lane Task Workflow - Phase 6 (T096)

        Args:
            task_id: Task UUID to retry.

        Returns:
            Updated task with pending enrichment status.

        Raises:
            Exception: If task not found.
        """
        task = await self.get_by_id(task_id)

        # Reset enrichment status to pending
        task.enrichment_status = EnrichmentStatus.PENDING
        task.error_message = None
        task.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(task)

        return task
