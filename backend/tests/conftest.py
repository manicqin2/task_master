"""Pytest configuration and fixtures."""
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Generator
from uuid import uuid4

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.api import app
from src.lib.database import get_db
from src.models import Base, Task, Workbench, Todo
from src.models.enums import EnrichmentStatus, TodoStatus


# Test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

# Create test session maker
test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with test_session_maker() as session:
        yield session

    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with database session override."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# T005: Sample task data fixtures for migration testing
@pytest.fixture
async def sample_tasks(db_session: AsyncSession) -> list[Task]:
    """Create sample tasks with various states for migration testing."""
    tasks = []

    # Task 1: Has only enrichment state (in workbench, not in todos)
    task1 = Task(
        id=str(uuid4()),
        user_input="Call John about the quarterly review meeting",
        enriched_text="Schedule quarterly review meeting with John",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        project="Work",
        requires_attention=False,
    )
    workbench1 = Workbench(
        id=str(uuid4()),
        task_id=task1.id,
        enrichment_status=EnrichmentStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    # Task 2: Has both enrichment and execution state (in both workbench and todos)
    task2 = Task(
        id=str(uuid4()),
        user_input="Email Sarah the project status update",
        enriched_text="Send project status email to Sarah",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        project="Work",
        requires_attention=False,
    )
    workbench2 = Workbench(
        id=str(uuid4()),
        task_id=task2.id,
        enrichment_status=EnrichmentStatus.COMPLETED,
        moved_to_todos_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    todo2 = Todo(
        id=str(uuid4()),
        task_id=task2.id,
        status=TodoStatus.OPEN,
        position=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    # Task 3: Failed enrichment (needs attention)
    task3 = Task(
        id=str(uuid4()),
        user_input="Review the Q4 budget",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        requires_attention=True,
    )
    workbench3 = Workbench(
        id=str(uuid4()),
        task_id=task3.id,
        enrichment_status=EnrichmentStatus.FAILED,
        error_message="Metadata extraction timeout",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db_session.add_all([task1, workbench1, task2, workbench2, todo2, task3, workbench3])
    await db_session.commit()

    tasks = [task1, task2, task3]
    return tasks


# T006: Database setup/teardown utilities
@pytest.fixture
async def clean_db(db_session: AsyncSession):
    """Clean database utility for test isolation."""
    yield
    # Cleanup after test
    await db_session.execute(Todo.__table__.delete())
    await db_session.execute(Workbench.__table__.delete())
    await db_session.execute(Task.__table__.delete())
    await db_session.commit()


# T007: Baseline record count utilities
@pytest.fixture
async def capture_baseline(db_session: AsyncSession):
    """Capture baseline record counts for migration validation."""
    async def _capture():
        task_count = await db_session.scalar(select(func.count()).select_from(Task))
        workbench_count = await db_session.scalar(select(func.count()).select_from(Workbench))
        todo_count = await db_session.scalar(select(func.count()).select_from(Todo))
        return {
            "tasks": task_count or 0,
            "workbench": workbench_count or 0,
            "todos": todo_count or 0,
        }
    return _capture
