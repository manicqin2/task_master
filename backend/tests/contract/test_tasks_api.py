"""Contract tests for /api/v1/tasks endpoints.

Tests verify API contracts match OpenAPI specification:
- Request/response schemas
- HTTP status codes
- Content types
- Error responses
"""
import pytest
from httpx import AsyncClient


class TestCreateTask:
    """Test POST /api/v1/tasks endpoint contract."""

    @pytest.mark.asyncio
    async def test_create_task_returns_201(self, client: AsyncClient):
        """Test that creating a task returns 201 Created."""
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "call mom"},
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_task_returns_task_schema(self, client: AsyncClient):
        """Test that response matches Task schema."""
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "call mom"},
        )
        data = response.json()

        # Verify required fields
        assert "id" in data
        assert "user_input" in data
        assert "enriched_text" in data
        assert "status" in data
        assert "enrichment_status" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "error_message" in data

        # Verify field types
        assert isinstance(data["id"], str)
        assert isinstance(data["user_input"], str)
        assert data["enriched_text"] is None  # Not enriched yet
        assert data["status"] == "open"
        assert data["enrichment_status"] == "pending"  # Initial state

    @pytest.mark.asyncio
    async def test_create_task_preserves_user_input(self, client: AsyncClient):
        """Test that user_input is preserved exactly as submitted."""
        user_input = "fix bug in login screan"
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": user_input},
        )
        data = response.json()
        assert data["user_input"] == user_input

    @pytest.mark.asyncio
    async def test_create_task_empty_input_returns_400(self, client: AsyncClient):
        """Test that empty input returns 400 Bad Request (FR-010)."""
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": ""},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_task_whitespace_only_returns_400(self, client: AsyncClient):
        """Test that whitespace-only input returns 400 (FR-010)."""
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "   "},
        )
        assert response.status_code == 400


class TestListTasks:
    """Test GET /api/v1/tasks endpoint contract."""

    @pytest.mark.asyncio
    async def test_list_tasks_returns_200(self, client: AsyncClient):
        """Test that listing tasks returns 200 OK."""
        response = await client.get("/api/v1/tasks")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_tasks_returns_array_and_count(self, client: AsyncClient):
        """Test that response contains tasks array and count."""
        response = await client.get("/api/v1/tasks")
        data = response.json()

        assert "tasks" in data
        assert "count" in data
        assert isinstance(data["tasks"], list)
        assert isinstance(data["count"], int)

    @pytest.mark.asyncio
    async def test_list_tasks_empty_returns_zero_count(self, client: AsyncClient):
        """Test that empty list returns count 0."""
        response = await client.get("/api/v1/tasks")
        data = response.json()

        assert data["count"] == 0
        assert len(data["tasks"]) == 0

    @pytest.mark.asyncio
    async def test_list_tasks_reverse_chronological_order(self, client: AsyncClient):
        """Test that tasks are ordered by created_at DESC (FR-007)."""
        # Create 3 tasks
        await client.post("/api/v1/tasks", json={"user_input": "task 1"})
        await client.post("/api/v1/tasks", json={"user_input": "task 2"})
        await client.post("/api/v1/tasks", json={"user_input": "task 3"})

        response = await client.get("/api/v1/tasks")
        data = response.json()

        assert data["count"] == 3
        # Newest (task 3) should be first
        assert data["tasks"][0]["user_input"] == "task 3"
        assert data["tasks"][1]["user_input"] == "task 2"
        assert data["tasks"][2]["user_input"] == "task 1"


class TestGetTask:
    """Test GET /api/v1/tasks/{id} endpoint contract."""

    @pytest.mark.asyncio
    async def test_get_task_returns_200(self, client: AsyncClient):
        """Test that getting existing task returns 200 OK."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test task"},
        )
        task_id = create_response.json()["id"]

        # Get task
        response = await client.get(f"/api/v1/tasks/{task_id}")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_task_returns_task_schema(self, client: AsyncClient):
        """Test that response matches Task schema."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test task"},
        )
        task_id = create_response.json()["id"]

        # Get task
        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        # Verify schema
        assert "id" in data
        assert "user_input" in data
        assert "enrichment_status" in data

    @pytest.mark.asyncio
    async def test_get_task_nonexistent_returns_404(self, client: AsyncClient):
        """Test that getting nonexistent task returns 404 Not Found."""
        response = await client.get("/api/v1/tasks/nonexistent-id")
        assert response.status_code == 404


class TestRetryTask:
    """Test POST /api/v1/tasks/:id/retry endpoint contract.

    Feature 003: Multi-Lane Task Workflow - Phase 6
    """

    @pytest.mark.asyncio
    async def test_retry_task_returns_200(self, client: AsyncClient):
        """T086: Test that retrying a task returns 200 OK with task."""
        # Create a task first
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test task for retry"},
        )
        task_id = create_response.json()["id"]

        # Retry the task
        response = await client.post(f"/api/v1/tasks/{task_id}/retry")
        assert response.status_code == 200

        # Verify response contains task
        data = response.json()
        assert "id" in data
        assert data["id"] == task_id
        assert "enrichment_status" in data

    @pytest.mark.asyncio
    async def test_retry_task_nonexistent_returns_404(self, client: AsyncClient):
        """T087: Test that retrying nonexistent task returns 404 Not Found."""
        response = await client.post("/api/v1/tasks/nonexistent-id/retry")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_retry_task_returns_task_schema(self, client: AsyncClient):
        """Test that retry response matches Task schema."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "test retry schema"},
        )
        task_id = create_response.json()["id"]

        # Retry task
        response = await client.post(f"/api/v1/tasks/{task_id}/retry")
        data = response.json()

        # Verify schema
        assert "id" in data
        assert "user_input" in data
        assert "enrichment_status" in data
        assert "status" in data
        assert "created_at" in data
        assert "updated_at" in data
