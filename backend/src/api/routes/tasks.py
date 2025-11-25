"""API routes for task management."""
import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...lib.database import get_db
from ...models.task import Task as TaskModel
from ...models.enums import EnrichmentStatus, TaskStatus
from ...services.task_service import TaskService
from ...services.enrichment_service import EnrichmentService
from ...services.task_queue import enrich_task_background


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# Request/Response schemas
class CreateTaskRequest(BaseModel):
    """Request schema for creating a task."""

    user_input: str = Field(..., min_length=1, description="User's task input text")


class TaskResponse(BaseModel):
    """Response schema for a task."""

    id: str
    user_input: str
    enriched_text: str | None
    status: TaskStatus
    enrichment_status: EnrichmentStatus
    created_at: str
    updated_at: str
    error_message: str | None

    class Config:
        from_attributes = True


class ListTasksResponse(BaseModel):
    """Response schema for listing tasks."""

    tasks: List[TaskResponse]
    count: int


# Endpoints
@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: CreateTaskRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create a new task and schedule background enrichment.

    Args:
        request: Task creation request with user_input.
        background_tasks: FastAPI background tasks for async enrichment.
        db: Database session.

    Returns:
        Created task with pending enrichment status.

    Raises:
        HTTPException: 400 if input is invalid (FR-010).
    """
    try:
        # Validate input (FR-010)
        if not request.user_input.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task input cannot be empty",
            )

        # Create task
        task_service = TaskService(db)
        task = await task_service.create(request.user_input)

        # Schedule background enrichment (FR-013, FR-014)
        enrichment_service = EnrichmentService()
        background_tasks.add_task(
            enrich_task_background,
            task.id,
            db,
            enrichment_service,
        )

        # Convert to response
        return TaskResponse(
            id=task.id,
            user_input=task.user_input,
            enriched_text=task.enriched_text,
            status=task.status,
            enrichment_status=task.enrichment_status,
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat(),
            error_message=task.error_message,
        )

    except ValueError as e:
        # Validation error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Server error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("", response_model=ListTasksResponse)
async def list_tasks(db: AsyncSession = Depends(get_db)):
    """List all tasks in reverse chronological order.

    Args:
        db: Database session.

    Returns:
        List of tasks with count (FR-007).
    """
    try:
        task_service = TaskService(db)
        tasks = await task_service.list()

        return ListTasksResponse(
            tasks=[
                TaskResponse(
                    id=task.id,
                    user_input=task.user_input,
                    enriched_text=task.enriched_text,
                    status=task.status,
                    enrichment_status=task.enrichment_status,
                    created_at=task.created_at.isoformat(),
                    updated_at=task.updated_at.isoformat(),
                    error_message=task.error_message,
                )
                for task in tasks
            ],
            count=len(tasks),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """Get a task by ID.

    Args:
        task_id: Task UUID.
        db: Database session.

    Returns:
        Task details.

    Raises:
        HTTPException: 404 if task not found.
    """
    try:
        task_service = TaskService(db)
        task = await task_service.get_by_id(task_id)

        return TaskResponse(
            id=task.id,
            user_input=task.user_input,
            enriched_text=task.enriched_text,
            status=task.status,
            enrichment_status=task.enrichment_status,
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat(),
            error_message=task.error_message,
        )

    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post(
    "/{task_id}/retry",
    response_model=TaskResponse,
    summary="Retry a failed task",
    description="""
    Retry a failed task by re-enqueueing it for enrichment.

    This endpoint:
    - Resets the task's enrichment_status to 'pending'
    - Clears any error_message
    - Re-enqueues the task to the background enrichment queue
    - Is idempotent (safe to call multiple times)

    Feature 003: Multi-Lane Task Workflow - Phase 6 (T091-T095, T098)
    """,
    responses={
        200: {
            "description": "Task successfully retried and re-enqueued",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_input": "call mom",
                        "enriched_text": None,
                        "status": "open",
                        "enrichment_status": "pending",
                        "created_at": "2025-11-05T12:00:00Z",
                        "updated_at": "2025-11-05T12:05:00Z",
                        "error_message": None,
                    }
                }
            },
        },
        404: {
            "description": "Task not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Task 550e8400-e29b-41d4-a716-446655440000 not found"}
                }
            },
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Internal server error: ..."}
                }
            },
        },
    },
)
async def retry_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Retry a failed task by re-enqueueing it for enrichment.

    Feature 003: Multi-Lane Task Workflow - Phase 6 (T091-T095)

    Args:
        task_id: Task UUID to retry.
        background_tasks: FastAPI background tasks for async enrichment.
        db: Database session.

    Returns:
        Updated task with pending enrichment status.

    Raises:
        HTTPException: 404 if task not found (T094).
    """
    try:
        # T097: Log retry attempt
        logger.info(f"Retrying task {task_id}")

        # T091-T093: Use TaskService to retry task
        task_service = TaskService(db)
        task = await task_service.retry_task(task_id)

        # T092: Re-enqueue task to enrichment queue
        enrichment_service = EnrichmentService()
        background_tasks.add_task(
            enrich_task_background,
            task.id,
            db,
            enrichment_service,
        )

        # T095: Idempotency - multiple retries are safe due to background task design
        # Each retry simply resets status and re-enqueues, which is harmless

        # T097: Log successful retry
        logger.info(
            f"Task {task_id} retry successful - reset to pending and re-enqueued"
        )

        return TaskResponse(
            id=task.id,
            user_input=task.user_input,
            enriched_text=task.enriched_text,
            status=task.status,
            enrichment_status=task.enrichment_status,
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat(),
            error_message=task.error_message,
        )

    except Exception as e:
        # T094: Return 404 for non-existent task
        if "not found" in str(e).lower():
            # T097: Log 404 error
            logger.warning(f"Task {task_id} not found for retry")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        # T097: Log internal error
        logger.error(f"Error retrying task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
