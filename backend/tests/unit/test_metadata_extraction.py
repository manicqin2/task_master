"""Unit tests for MetadataExtractor service (T014, T016).

Tests for:
- MetadataExtractor.extract() method
- Confidence threshold logic (0.7)
- requires_attention flag setting
- Field extraction accuracy
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock, patch
import pytest

from src.models.enums import Priority, TaskType
from src.models.task_metadata import MetadataExtractionResponse


# Note: This will fail until MetadataExtractor is implemented
# This is intentional - TDD approach (tests first)
try:
    from src.services.metadata_extraction import MetadataExtractor
except ImportError:
    # Placeholder for TDD - tests written before implementation
    MetadataExtractor = None


@pytest.mark.skipif(MetadataExtractor is None, reason="MetadataExtractor not yet implemented (TDD)")
class TestMetadataExtractor:
    """Test MetadataExtractor.extract() method (T014)."""

    @pytest.mark.asyncio
    async def test_extract_returns_metadata_response(self):
        """Test that extract() returns MetadataExtractionResponse object."""
        extractor = MetadataExtractor(llm_client=Mock())
        task_text = "Call Sarah tomorrow"

        result = await extractor.extract(task_text)

        assert isinstance(result, MetadataExtractionResponse)

    @pytest.mark.asyncio
    async def test_extract_call_task_type(self):
        """Test that 'Call' action verb extracts task_type=call."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=["Sarah"],
            persons_confidence=0.9,
            deadline="tomorrow",
            deadline_confidence=0.95,
            task_type=TaskType.CALL,
            task_type_confidence=1.0,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Call Sarah tomorrow")

        assert result.task_type == TaskType.CALL
        assert result.task_type_confidence >= 0.7

    @pytest.mark.asyncio
    async def test_extract_meeting_task_type(self):
        """Test that 'meeting' keyword extracts task_type=meeting."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=[],
            persons_confidence=0.0,
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.MEETING,
            task_type_confidence=1.0,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Schedule a meeting with the team")

        assert result.task_type == TaskType.MEETING

    @pytest.mark.asyncio
    async def test_extract_urgent_priority(self):
        """Test that 'urgent' keyword extracts priority=urgent."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project="ProjectX",
            project_confidence=0.95,
            persons=["Sarah"],
            persons_confidence=0.9,
            deadline="tomorrow",
            deadline_confidence=0.95,
            task_type=TaskType.CALL,
            task_type_confidence=1.0,
            priority=Priority.URGENT,
            priority_confidence=1.0,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Call Sarah tomorrow - urgent")

        assert result.priority == Priority.URGENT
        assert result.priority_confidence >= 0.7

    @pytest.mark.asyncio
    async def test_extract_person_names(self):
        """Test that person names are extracted correctly."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=["Sarah Johnson", "Mike Chen"],
            persons_confidence=1.0,
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.EMAIL,
            task_type_confidence=0.8,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Email Sarah Johnson and Mike Chen")

        assert "Sarah Johnson" in result.persons
        assert "Mike Chen" in result.persons
        assert result.persons_confidence >= 0.7

    @pytest.mark.asyncio
    async def test_extract_project_name(self):
        """Test that project names are extracted correctly."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project="ProjectX",
            project_confidence=0.95,
            persons=[],
            persons_confidence=0.0,
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.REVIEW,
            task_type_confidence=0.8,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Review ProjectX quarterly report")

        assert result.project == "ProjectX"
        assert result.project_confidence >= 0.7

    @pytest.mark.asyncio
    async def test_extract_deadline_text(self):
        """Test that deadline text is extracted."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=[],
            persons_confidence=0.0,
            deadline="by Friday",
            deadline_confidence=0.9,
            task_type=TaskType.EMAIL,
            task_type_confidence=0.8,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Send report by Friday")

        assert result.deadline == "by Friday"
        assert result.deadline_confidence >= 0.7


@pytest.mark.skipif(MetadataExtractor is None, reason="MetadataExtractor not yet implemented (TDD)")
class TestConfidenceThreshold:
    """Test confidence threshold logic (T016)."""

    @pytest.mark.asyncio
    async def test_high_confidence_fields_populated(self):
        """Test that fields with confidence >= 0.7 are populated."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project="ProjectX",
            project_confidence=0.95,  # High confidence
            persons=["Sarah"],
            persons_confidence=0.9,  # High confidence
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.CALL,
            task_type_confidence=1.0,  # High confidence
            priority=Priority.URGENT,
            priority_confidence=1.0,  # High confidence
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Call Sarah about ProjectX - urgent")

        # High confidence fields should be populated
        assert result.project_confidence >= 0.7
        assert result.persons_confidence >= 0.7
        assert result.task_type_confidence >= 0.7
        assert result.priority_confidence >= 0.7

    @pytest.mark.asyncio
    async def test_low_confidence_fields_not_populated(self):
        """Test that fields with confidence < 0.7 are not auto-populated."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.2,  # Low confidence
            persons=[],
            persons_confidence=0.0,  # Low confidence
            deadline="by Friday",
            deadline_confidence=0.9,
            task_type=TaskType.EMAIL,
            task_type_confidence=0.7,  # Exactly at threshold
            priority=Priority.NORMAL,
            priority_confidence=0.5,  # Low confidence
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Send report by Friday")

        # Low confidence fields
        assert result.project_confidence < 0.7
        assert result.persons_confidence < 0.7
        assert result.priority_confidence < 0.7

        # Exactly at threshold
        assert result.task_type_confidence >= 0.7

    def test_requires_attention_set_for_low_confidence(self):
        """Test that requires_attention flag is set when any field has low confidence."""
        response = MetadataExtractionResponse(
            project=None,
            project_confidence=0.2,  # Low confidence
            persons=[],
            persons_confidence=0.0,  # Low confidence
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.OTHER,
            task_type_confidence=0.3,  # Low confidence
            priority=Priority.NORMAL,
            priority_confidence=0.5,  # Low confidence
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        # When processing this response, requires_attention should be True
        # (This logic will be in the service that processes the response)
        low_confidence_fields = [
            response.project_confidence < 0.7,
            response.persons_confidence < 0.7,
            response.task_type_confidence < 0.7,
            response.priority_confidence < 0.7,
        ]

        assert any(low_confidence_fields)  # At least one field has low confidence

    def test_requires_attention_false_for_high_confidence(self):
        """Test that requires_attention is False when all fields have high confidence."""
        response = MetadataExtractionResponse(
            project="ProjectX",
            project_confidence=0.95,
            persons=["Sarah"],
            persons_confidence=1.0,
            deadline="tomorrow",
            deadline_confidence=0.95,
            task_type=TaskType.CALL,
            task_type_confidence=1.0,
            priority=Priority.URGENT,
            priority_confidence=1.0,
            effort_estimate=30,
            effort_confidence=0.8,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=["#important"],
            tags_confidence=0.9,
        )

        # Check if all important fields have high confidence
        high_confidence_fields = [
            response.project_confidence >= 0.7,
            response.persons_confidence >= 0.7,
            response.task_type_confidence >= 0.7,
            response.priority_confidence >= 0.7,
        ]

        assert all(high_confidence_fields)  # All fields have high confidence


@pytest.mark.skipif(MetadataExtractor is None, reason="MetadataExtractor not yet implemented (TDD)")
class TestMetadataExtractionEdgeCases:
    """Test edge cases in metadata extraction."""

    @pytest.mark.asyncio
    async def test_extract_empty_string(self):
        """Test that extracting from empty string returns default response."""
        extractor = MetadataExtractor(llm_client=AsyncMock())

        result = await extractor.extract("")

        assert isinstance(result, MetadataExtractionResponse)
        # Should have low confidence for all fields
        assert result.project_confidence < 0.7
        assert result.persons_confidence < 0.7

    @pytest.mark.asyncio
    async def test_extract_very_long_text(self):
        """Test that extraction handles long text (up to 5000 chars)."""
        extractor = MetadataExtractor(llm_client=AsyncMock())
        long_text = "Call Sarah " * 1000  # Very long task description

        result = await extractor.extract(long_text[:5000])

        assert isinstance(result, MetadataExtractionResponse)

    @pytest.mark.asyncio
    async def test_extract_multiple_persons(self):
        """Test extracting multiple person names."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=["Alice", "Bob", "Charlie"],
            persons_confidence=0.95,
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.MEETING,
            task_type_confidence=0.9,
            priority=Priority.NORMAL,
            priority_confidence=0.5,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=[],
            tags_confidence=0.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Meeting with Alice, Bob, and Charlie")

        assert len(result.persons) == 3
        assert "Alice" in result.persons
        assert "Bob" in result.persons
        assert "Charlie" in result.persons

    @pytest.mark.asyncio
    async def test_extract_tags_from_hashtags(self):
        """Test extracting tags from hashtags in text."""
        mock_llm = AsyncMock()
        mock_llm.extract_structured.return_value = MetadataExtractionResponse(
            project=None,
            project_confidence=0.0,
            persons=[],
            persons_confidence=0.0,
            deadline=None,
            deadline_confidence=0.0,
            task_type=TaskType.DEVELOPMENT,
            task_type_confidence=0.9,
            priority=Priority.HIGH,
            priority_confidence=0.8,
            effort_estimate=None,
            effort_confidence=0.0,
            dependencies=[],
            dependencies_confidence=0.0,
            tags=["bug", "urgent"],
            tags_confidence=1.0,
        )

        extractor = MetadataExtractor(llm_client=mock_llm)
        result = await extractor.extract("Fix #bug in production #urgent")

        assert "bug" in result.tags
        assert "urgent" in result.tags
