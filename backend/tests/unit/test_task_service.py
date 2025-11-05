"""Unit tests for TaskService CRUD operations.

Tests verify business logic for task management:
- Task creation with validation
- Task listing with ordering
- Task retrieval
- Status update transitions
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import EnrichmentStatus, TaskStatus
from src.services.task_service import TaskService


class TestTaskServiceCreate:
    """Test TaskService.create() method."""

    @pytest.mark.asyncio
    async def test_create_returns_task_with_id(self, db_session: AsyncSession):
        """Test that create returns a task with generated ID."""
        # Arrange
        service = TaskService(db_session)

        # Act
        task = await service.create("test task")

        # Assert
        assert task.id is not None
        assert len(task.id) == 36  # UUID4 length

    @pytest.mark.asyncio
    async def test_create_preserves_user_input(self, db_session: AsyncSession):
        """Test that create preserves exact user input."""
        # Arrange
        service = TaskService(db_session)
        user_input = "fix bug in login screan"  # Typo preserved

        # Act
        task = await service.create(user_input)

        # Assert
        assert task.user_input == user_input

    @pytest.mark.asyncio
    async def test_create_sets_pending_enrichment_status(self, db_session: AsyncSession):
        """Test that new tasks have pending enrichment status."""
        # Arrange
        service = TaskService(db_session)

        # Act
        task = await service.create("test task")

        # Assert
        assert task.enrichment_status == EnrichmentStatus.PENDING
        assert task.enriched_text is None

    @pytest.mark.asyncio
    async def test_create_sets_open_status(self, db_session: AsyncSession):
        """Test that new tasks have open status."""
        # Arrange
        service = TaskService(db_session)

        # Act
        task = await service.create("test task")

        # Assert
        assert task.status == TaskStatus.OPEN

    @pytest.mark.asyncio
    async def test_create_sets_timestamps(self, db_session: AsyncSession):
        """Test that create sets created_at and updated_at."""
        # Arrange
        service = TaskService(db_session)

        # Act
        task = await service.create("test task")

        # Assert
        assert task.created_at is not None
        assert task.updated_at is not None
        assert task.created_at == task.updated_at  # Initially same

    @pytest.mark.asyncio
    async def test_create_rejects_empty_input(self, db_session: AsyncSession):
        """Test that create raises ValueError for empty input (FR-010)."""
        # Arrange
        service = TaskService(db_session)

        # Act & Assert
        with pytest.raises(ValueError, match="empty"):
            await service.create("")

    @pytest.mark.asyncio
    async def test_create_rejects_whitespace_only_input(self, db_session: AsyncSession):
        """Test that create raises ValueError for whitespace-only input (FR-010)."""
        # Arrange
        service = TaskService(db_session)

        # Act & Assert
        with pytest.raises(ValueError, match="empty"):
            await service.create("   ")


class TestTaskServiceList:
    """Test TaskService.list() method."""

    @pytest.mark.asyncio
    async def test_list_returns_empty_array_when_no_tasks(self, db_session: AsyncSession):
        """Test that list returns empty array when no tasks exist."""
        # Arrange
        service = TaskService(db_session)

        # Act
        tasks = await service.list()

        # Assert
        assert tasks == []

    @pytest.mark.asyncio
    async def test_list_returns_all_tasks(self, db_session: AsyncSession):
        """Test that list returns all tasks."""
        # Arrange
        service = TaskService(db_session)
        await service.create("task 1")
        await service.create("task 2")
        await service.create("task 3")

        # Act
        tasks = await service.list()

        # Assert
        assert len(tasks) == 3

    @pytest.mark.asyncio
    async def test_list_orders_by_created_at_desc(self, db_session: AsyncSession):
        """Test that list returns tasks in reverse chronological order (FR-007)."""
        # Arrange
        service = TaskService(db_session)
        task1 = await service.create("task 1")
        task2 = await service.create("task 2")
        task3 = await service.create("task 3")

        # Act
        tasks = await service.list()

        # Assert: Newest first
        assert tasks[0].id == task3.id
        assert tasks[1].id == task2.id
        assert tasks[2].id == task1.id


class TestTaskServiceGetById:
    """Test TaskService.get_by_id() method."""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_existing_task(self, db_session: AsyncSession):
        """Test that get_by_id returns the correct task."""
        # Arrange
        service = TaskService(db_session)
        task = await service.create("test task")

        # Act
        retrieved = await service.get_by_id(task.id)

        # Assert
        assert retrieved.id == task.id
        assert retrieved.user_input == "test task"

    @pytest.mark.asyncio
    async def test_get_by_id_raises_not_found_for_nonexistent(self, db_session: AsyncSession):
        """Test that get_by_id raises exception for nonexistent task."""
        # Arrange
        service = TaskService(db_session)

        # Act & Assert
        with pytest.raises(Exception, match="not found"):
            await service.get_by_id("nonexistent-id")


class TestTaskServiceUpdateEnrichment:
    """Test TaskService.update_enrichment() method."""

    @pytest.mark.asyncio
    async def test_update_enrichment_sets_enriched_text(self, db_session: AsyncSession):
        """Test that update_enrichment sets enriched_text."""
        # Arrange
        service = TaskService(db_session)
        task = await service.create("call mom")

        # Act
        await service.update_enrichment(
            task.id,
            enriched_text="Call Mom to discuss weekend plans",
            status=EnrichmentStatus.COMPLETED,
        )

        # Assert
        updated_task = await service.get_by_id(task.id)
        assert updated_task.enriched_text == "Call Mom to discuss weekend plans"
        assert updated_task.enrichment_status == EnrichmentStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_update_enrichment_can_set_failed_status(self, db_session: AsyncSession):
        """Test that update_enrichment can set failed status with error message (FR-018)."""
        # Arrange
        service = TaskService(db_session)
        task = await service.create("test task")

        # Act
        await service.update_enrichment(
            task.id,
            status=EnrichmentStatus.FAILED,
            error_message="Ollama connection failed",
        )

        # Assert
        updated_task = await service.get_by_id(task.id)
        assert updated_task.enrichment_status == EnrichmentStatus.FAILED
        assert updated_task.error_message == "Ollama connection failed"
        assert updated_task.enriched_text is None

    @pytest.mark.asyncio
    async def test_update_enrichment_updates_timestamp(self, db_session: AsyncSession):
        """Test that update_enrichment updates updated_at timestamp."""
        # Arrange
        service = TaskService(db_session)
        task = await service.create("test task")
        original_updated_at = task.updated_at

        # Act
        await service.update_enrichment(
            task.id,
            enriched_text="Enriched",
            status=EnrichmentStatus.COMPLETED,
        )

        # Assert
        updated_task = await service.get_by_id(task.id)
        assert updated_task.updated_at > original_updated_at
