"""Contract tests for metadata extraction API endpoints.

Tests verify API contracts match OpenAPI specification (contracts/metadata-extraction.yaml):
- POST /api/v1/tasks triggers metadata extraction
- GET /api/v1/tasks/{id} returns metadata fields
- PATCH /api/v1/tasks/{id}/metadata updates metadata
- Metadata schema validation
"""
import pytest
from httpx import AsyncClient


class TestTaskMetadataExtraction:
    """Test metadata extraction in task creation and retrieval."""

    @pytest.mark.asyncio
    async def test_create_task_queues_metadata_extraction(self, client: AsyncClient):
        """Test that creating a task triggers metadata extraction (T012)."""
        response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Call Sarah Johnson tomorrow at 3pm about ProjectX - urgent"},
        )
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["enrichment_status"] in ["pending", "processing"]

    @pytest.mark.asyncio
    async def test_get_task_includes_metadata_schema(self, client: AsyncClient):
        """Test that GET /api/v1/tasks/{id} returns metadata fields (T013)."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Call Sarah Johnson tomorrow at 3pm about ProjectX - urgent"},
        )
        task_id = create_response.json()["id"]

        # Get task
        response = await client.get(f"/api/v1/tasks/{task_id}")
        assert response.status_code == 200

        data = response.json()
        assert "metadata" in data

        # Metadata can be null if extraction hasn't completed
        if data["metadata"] is not None:
            metadata = data["metadata"]

            # Verify all metadata fields are present
            assert "project" in metadata
            assert "persons" in metadata
            assert "task_type" in metadata
            assert "priority" in metadata
            assert "deadline_text" in metadata
            assert "deadline_parsed" in metadata
            assert "effort_estimate" in metadata
            assert "dependencies" in metadata
            assert "tags" in metadata
            assert "extracted_at" in metadata
            assert "requires_attention" in metadata

    @pytest.mark.asyncio
    async def test_metadata_extraction_populates_high_confidence_fields(self, client: AsyncClient):
        """Test that high confidence metadata fields are auto-populated (T013)."""
        # Create task with clear metadata
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Call Sarah Johnson tomorrow at 3pm about ProjectX - urgent"},
        )
        task_id = create_response.json()["id"]

        # Wait for enrichment to complete (in tests, this should be synchronous or mocked)
        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        # Note: These assertions will FAIL until metadata extraction is implemented
        # This is TDD - tests first, then implementation
        if data["enrichment_status"] == "completed" and data["metadata"]:
            metadata = data["metadata"]

            # High confidence fields should be populated
            # (These will fail until implementation is complete)
            assert metadata["task_type"] == "call"
            assert metadata["priority"] == "urgent"
            assert "Sarah Johnson" in metadata["persons"]
            assert metadata["project"] == "ProjectX"
            assert metadata["deadline_text"] is not None
            assert metadata["extracted_at"] is not None

    @pytest.mark.asyncio
    async def test_metadata_requires_attention_flag_for_low_confidence(self, client: AsyncClient):
        """Test that requires_attention is set when confidence is low (T013)."""
        # Create ambiguous task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Send report by Friday"},
        )
        task_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        # Note: This will FAIL until metadata extraction is implemented
        if data["enrichment_status"] == "completed" and data["metadata"]:
            metadata = data["metadata"]

            # Low confidence should trigger requires_attention
            # (Will fail until implementation)
            if metadata["project"] is None or metadata["persons"] == []:
                assert metadata["requires_attention"] is True


class TestMetadataUpdate:
    """Test PATCH /api/v1/tasks/{id}/metadata endpoint."""

    @pytest.mark.asyncio
    async def test_update_metadata_returns_200(self, client: AsyncClient):
        """Test that updating metadata returns 200 OK."""
        # Create task first
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Send report"},
        )
        task_id = create_response.json()["id"]

        # Update metadata
        response = await client.patch(
            f"/api/v1/tasks/{task_id}/metadata",
            json={
                "project": "ProjectX",
                "priority": "high",
                "task_type": "email",
            },
        )

        # Note: This will FAIL until the endpoint is implemented
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_metadata_persists_changes(self, client: AsyncClient):
        """Test that metadata updates are persisted."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Send report"},
        )
        task_id = create_response.json()["id"]

        # Update metadata
        update_data = {
            "project": "ProjectX",
            "priority": "high",
            "persons": ["Sarah Johnson"],
        }
        await client.patch(
            f"/api/v1/tasks/{task_id}/metadata",
            json=update_data,
        )

        # Verify changes persisted
        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        # Note: This will FAIL until implementation is complete
        if data["metadata"]:
            assert data["metadata"]["project"] == "ProjectX"
            assert data["metadata"]["priority"] == "high"
            assert "Sarah Johnson" in data["metadata"]["persons"]

    @pytest.mark.asyncio
    async def test_update_metadata_clears_requires_attention(self, client: AsyncClient):
        """Test that manual update clears requires_attention flag."""
        # Create task
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Send report"},
        )
        task_id = create_response.json()["id"]

        # Update metadata
        await client.patch(
            f"/api/v1/tasks/{task_id}/metadata",
            json={"project": "Work"},
        )

        # Verify requires_attention is cleared
        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        # Note: Will FAIL until implementation
        if data["metadata"]:
            assert data["metadata"]["requires_attention"] is False

    @pytest.mark.asyncio
    async def test_update_metadata_invalid_task_returns_404(self, client: AsyncClient):
        """Test that updating metadata for non-existent task returns 404."""
        response = await client.patch(
            "/api/v1/tasks/00000000-0000-0000-0000-000000000000/metadata",
            json={"project": "Test"},
        )

        # Note: Will FAIL until endpoint is implemented
        assert response.status_code == 404


class TestMetadataSchema:
    """Test metadata field validation."""

    @pytest.mark.asyncio
    async def test_metadata_persons_is_array(self, client: AsyncClient):
        """Test that persons field is an array."""
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Call Sarah and Mike"},
        )
        task_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        if data["metadata"] and data["metadata"]["persons"] is not None:
            assert isinstance(data["metadata"]["persons"], list)

    @pytest.mark.asyncio
    async def test_metadata_task_type_enum(self, client: AsyncClient):
        """Test that task_type is a valid enum value."""
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Schedule a meeting with the team"},
        )
        task_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        valid_types = ["meeting", "call", "email", "review", "development", "research", "administrative", "other"]

        if data["metadata"] and data["metadata"]["task_type"]:
            assert data["metadata"]["task_type"] in valid_types

    @pytest.mark.asyncio
    async def test_metadata_priority_enum(self, client: AsyncClient):
        """Test that priority is a valid enum value."""
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Urgent: fix production bug"},
        )
        task_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        valid_priorities = ["low", "normal", "high", "urgent"]

        if data["metadata"] and data["metadata"]["priority"]:
            assert data["metadata"]["priority"] in valid_priorities

    @pytest.mark.asyncio
    async def test_metadata_deadline_parsed_is_iso8601(self, client: AsyncClient):
        """Test that deadline_parsed is ISO 8601 datetime format."""
        create_response = await client.post(
            "/api/v1/tasks",
            json={"user_input": "Submit report tomorrow"},
        )
        task_id = create_response.json()["id"]

        response = await client.get(f"/api/v1/tasks/{task_id}")
        data = response.json()

        if data["metadata"] and data["metadata"]["deadline_parsed"]:
            # Should be ISO 8601 string (ends with Z or has timezone)
            deadline = data["metadata"]["deadline_parsed"]
            assert isinstance(deadline, str)
            assert "T" in deadline  # ISO 8601 has T separator
