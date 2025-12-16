"""API routes for task management."""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...lib.database import get_db
from ...models.task import Task as TaskModel
from ...models.workbench import Workbench as WorkbenchModel
from ...models.todos import Todo as TodoModel
from ...models.enums import EnrichmentStatus, TodoStatus
from ...models.task_metadata import TaskMetadataUpdate
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
    """Response schema for core task data with metadata."""

    id: str
    user_input: str
    enriched_text: str | None
    created_at: str
    updated_at: str

    # Metadata fields (stored directly on tasks table)
    project: str | None
    persons: List[str]
    task_type: str | None
    priority: str | None
    deadline_text: str | None
    deadline_parsed: str | None
    effort_estimate: int | None
    dependencies: List[str]
    tags: List[str]
    extracted_at: str | None
    requires_attention: bool

    class Config:
        from_attributes = True


class WorkbenchEntryResponse(BaseModel):
    """Response schema for workbench entry data."""

    id: str
    task_id: str
    enrichment_status: EnrichmentStatus
    error_message: str | None
    metadata_suggestions: str | None
    moved_to_todos_at: str | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TodoEntryResponse(BaseModel):
    """Response schema for todo entry data."""

    id: str
    task_id: str
    status: TodoStatus
    position: int | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class WorkbenchTaskResponse(TaskResponse):
    """Response schema for task with workbench data (flattened structure)."""

    workbench: WorkbenchEntryResponse

    class Config:
        from_attributes = True


class TodoTaskResponse(TaskResponse):
    """Response schema for task with todo data (flattened structure)."""

    todo: TodoEntryResponse

    class Config:
        from_attributes = True


class ListWorkbenchTasksResponse(BaseModel):
    """Response schema for listing workbench tasks."""

    tasks: List[WorkbenchTaskResponse]
    count: int


class ListTodoTasksResponse(BaseModel):
    """Response schema for listing todo tasks."""

    tasks: List[TodoTaskResponse]
    count: int


# Helper functions
def task_to_response(task: TaskModel) -> TaskResponse:
    """Convert Task model to TaskResponse.

    Args:
        task: Task model instance

    Returns:
        TaskResponse with all metadata fields
    """
    # Parse JSON fields
    persons = json.loads(task.persons) if task.persons else []
    dependencies = json.loads(task.dependencies) if task.dependencies else []
    tags = json.loads(task.tags) if task.tags else []

    return TaskResponse(
        id=task.id,
        user_input=task.user_input,
        enriched_text=task.enriched_text,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
        project=task.project,
        persons=persons,
        task_type=task.task_type,
        priority=task.priority,
        deadline_text=task.deadline_text,
        deadline_parsed=task.deadline_parsed.isoformat() if task.deadline_parsed else None,
        effort_estimate=task.effort_estimate,
        dependencies=dependencies,
        tags=tags,
        extracted_at=task.extracted_at.isoformat() if task.extracted_at else None,
        requires_attention=task.requires_attention,
    )


def workbench_entry_to_response(workbench: WorkbenchModel) -> WorkbenchEntryResponse:
    """Convert Workbench model to WorkbenchEntryResponse.

    Args:
        workbench: Workbench model instance

    Returns:
        WorkbenchEntryResponse
    """
    return WorkbenchEntryResponse(
        id=workbench.id,
        task_id=workbench.task_id,
        enrichment_status=workbench.enrichment_status,
        error_message=workbench.error_message,
        metadata_suggestions=workbench.metadata_suggestions,
        moved_to_todos_at=workbench.moved_to_todos_at.isoformat() if workbench.moved_to_todos_at else None,
        created_at=workbench.created_at.isoformat(),
        updated_at=workbench.updated_at.isoformat(),
    )


def todo_entry_to_response(todo: TodoModel) -> TodoEntryResponse:
    """Convert Todo model to TodoEntryResponse.

    Args:
        todo: Todo model instance

    Returns:
        TodoEntryResponse
    """
    return TodoEntryResponse(
        id=todo.id,
        task_id=todo.task_id,
        status=todo.status,
        position=todo.position,
        created_at=todo.created_at.isoformat(),
        updated_at=todo.updated_at.isoformat(),
    )


# Endpoints

# T041: GET /api/tasks with enrichment_status filter (workbench-only join)
@router.get("", response_model=ListWorkbenchTasksResponse)
async def list_tasks(
    enrichment_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List tasks with optional enrichment_status filter.

    Query optimization (User Story 2): When filtering by enrichment_status,
    this endpoint joins ONLY tasks + workbench tables (not todos) for better performance.

    Args:
        enrichment_status: Optional filter for enrichment status (pending/processing/completed/failed).
        db: Database session.

    Returns:
        List of tasks matching the filter criteria.

    Raises:
        HTTPException: 400 if enrichment_status is invalid.
    """
    try:
        task_service = TaskService(db)

        if enrichment_status:
            # Validate enrichment_status value
            try:
                status_enum = EnrichmentStatus(enrichment_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid enrichment_status: {enrichment_status}. "
                    f"Must be one of: pending, processing, completed, failed",
                )

            # T039: Use optimized query (tasks + workbench only, no todos)
            task_workbench_pairs = await task_service.get_tasks_by_enrichment_status(status_enum)
        else:
            # No filter - return all workbench tasks
            task_workbench_pairs = await task_service.list_workbench_tasks()

        workbench_tasks = []
        for task, workbench in task_workbench_pairs:
            task_data = task_to_response(task)
            workbench_tasks.append(
                WorkbenchTaskResponse(
                    **task_data.model_dump(),
                    workbench=workbench_entry_to_response(workbench),
                )
            )

        return ListWorkbenchTasksResponse(
            tasks=workbench_tasks,
            count=len(workbench_tasks),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("", response_model=WorkbenchTaskResponse, status_code=status.HTTP_201_CREATED)
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
        Created task with workbench entry (pending enrichment status).

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

        # Create task and workbench entry
        task_service = TaskService(db)
        task, workbench = await task_service.create(request.user_input)

        # Schedule background enrichment (FR-013, FR-014)
        enrichment_service = EnrichmentService()
        background_tasks.add_task(
            enrich_task_background,
            task.id,
            db,
            enrichment_service,
        )

        # Convert to response (flatten task fields)
        task_data = task_to_response(task)
        return WorkbenchTaskResponse(
            **task_data.model_dump(),
            workbench=workbench_entry_to_response(workbench),
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


@router.get("/workbench", response_model=ListWorkbenchTasksResponse)
async def list_workbench_tasks(db: AsyncSession = Depends(get_db)):
    """List all tasks in workbench (not yet moved to todos).

    Args:
        db: Database session.

    Returns:
        List of workbench tasks with count.
    """
    try:
        task_service = TaskService(db)
        task_workbench_pairs = await task_service.list_workbench_tasks()

        workbench_tasks = []
        for task, workbench in task_workbench_pairs:
            task_data = task_to_response(task)
            workbench_tasks.append(
                WorkbenchTaskResponse(
                    **task_data.model_dump(),
                    workbench=workbench_entry_to_response(workbench),
                )
            )

        return ListWorkbenchTasksResponse(
            tasks=workbench_tasks,
            count=len(workbench_tasks),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/todos", response_model=ListTodoTasksResponse)
async def list_todo_tasks(db: AsyncSession = Depends(get_db)):
    """List all tasks in todo list (for todo/project/persons/agenda views).

    Args:
        db: Database session.

    Returns:
        List of todo tasks with count.
    """
    try:
        task_service = TaskService(db)
        task_todo_pairs = await task_service.list_todo_tasks()

        todo_tasks = []
        for task, todo in task_todo_pairs:
            task_data = task_to_response(task)
            todo_tasks.append(
                TodoTaskResponse(
                    **task_data.model_dump(),
                    todo=todo_entry_to_response(todo),
                )
            )

        return ListTodoTasksResponse(
            tasks=todo_tasks,
            count=len(todo_tasks),
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

        return task_to_response(task)

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
    response_model=WorkbenchTaskResponse,
    summary="Retry a failed task",
    description="""
    Retry a failed task by re-enqueueing it for enrichment.

    This endpoint:
    - Resets the workbench entry's enrichment_status to 'pending'
    - Clears any error_message
    - Re-enqueues the task to the background enrichment queue
    - Is idempotent (safe to call multiple times)

    Feature 003: Multi-Lane Task Workflow - Phase 6 (T091-T095, T098)
    """,
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
        Updated task with workbench entry (pending enrichment status).

    Raises:
        HTTPException: 404 if task not found (T094).
    """
    try:
        # T097: Log retry attempt
        logger.info(f"Retrying task {task_id}")

        # T091-T093: Use TaskService to retry task
        task_service = TaskService(db)
        task, workbench = await task_service.retry_task(task_id)

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

        task_data = task_to_response(task)
        return WorkbenchTaskResponse(
            **task_data.model_dump(),
            workbench=workbench_entry_to_response(workbench),
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


@router.post(
    "/{task_id}/move-to-todos",
    response_model=TodoTaskResponse,
    summary="Move task from workbench to todos",
    description="""
    Move a task from workbench to todos list.

    This endpoint:
    - Sets the workbench entry's moved_to_todos_at timestamp
    - Creates a new todo entry for the task
    - Returns the task with its todo entry
    """,
)
async def move_task_to_todos(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Move a task from workbench to todos list.

    Args:
        task_id: Task UUID to move.
        db: Database session.

    Returns:
        Task with todo entry.

    Raises:
        HTTPException: 404 if task not found.
        HTTPException: 400 if task already moved.
    """
    try:
        logger.info(f"Moving task {task_id} to todos")

        task_service = TaskService(db)
        task, workbench, todo = await task_service.move_to_todos(task_id)

        logger.info(f"Task {task_id} moved to todos successfully")

        task_data = task_to_response(task)
        return TodoTaskResponse(
            **task_data.model_dump(),
            todo=todo_entry_to_response(todo),
        )

    except Exception as e:
        if "not found" in str(e).lower():
            logger.warning(f"Task {task_id} not found for move to todos")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        if "already moved" in str(e).lower():
            logger.warning(f"Task {task_id} already moved to todos")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task {task_id} already moved to todos",
            )
        logger.error(f"Error moving task {task_id} to todos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.patch("/{task_id}/metadata", response_model=TaskResponse)
async def update_task_metadata(
    task_id: str,
    metadata_update: TaskMetadataUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update task metadata manually (T024).

    This endpoint allows users to confirm or edit metadata extracted from task descriptions.
    Used primarily for tasks in the "Need Attention" lane with low-confidence extractions.

    Feature 004: Task Metadata Extraction - Phase 3 User Story 1

    Args:
        task_id: Task UUID to update.
        metadata_update: Metadata fields to update (partial update allowed).
        db: Database session.

    Returns:
        Updated task with new metadata.

    Raises:
        HTTPException: 404 if task not found.
    """
    try:
        logger.info(f"Updating metadata for task {task_id}")

        # Get task
        task_service = TaskService(db)
        task = await task_service.get_by_id(task_id)

        # Update metadata fields (partial update)
        if metadata_update.project is not None:
            task.project = metadata_update.project

        if metadata_update.persons is not None:
            task.persons = json.dumps(metadata_update.persons)

        if metadata_update.task_type is not None:
            task.task_type = metadata_update.task_type

        if metadata_update.priority is not None:
            task.priority = metadata_update.priority

        if metadata_update.deadline_text is not None:
            task.deadline_text = metadata_update.deadline_text

        if metadata_update.deadline_parsed is not None:
            task.deadline_parsed = metadata_update.deadline_parsed

        if metadata_update.effort_estimate is not None:
            task.effort_estimate = metadata_update.effort_estimate

        if metadata_update.dependencies is not None:
            task.dependencies = json.dumps(metadata_update.dependencies)

        if metadata_update.tags is not None:
            task.tags = json.dumps(metadata_update.tags)

        # Clear requires_attention flag when user manually updates
        task.requires_attention = False

        # Commit changes
        await db.commit()
        await db.refresh(task)

        logger.info(f"Metadata updated successfully for task {task_id}")

        return task_to_response(task)

    except Exception as e:
        if "not found" in str(e).lower():
            logger.warning(f"Task {task_id} not found for metadata update")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        logger.error(f"Error updating metadata for task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a task.

    Used when canceling tasks from the error lane.

    Args:
        task_id: Task UUID to delete.
        db: Database session.

    Raises:
        HTTPException: 404 if task not found.
    """
    try:
        logger.info(f"Deleting task {task_id}")

        task_service = TaskService(db)
        await task_service.delete(task_id)

        logger.info(f"Task {task_id} deleted successfully")

    except Exception as e:
        if "not found" in str(e).lower():
            logger.warning(f"Task {task_id} not found for deletion")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        logger.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
