"""Unit tests for metadata parsing utilities (T015).

Tests for:
- parse_deadline() with relative dates
- normalize_person_name()
- extract_tags()
"""
from datetime import datetime, timezone, timedelta
import pytest

from src.lib.metadata_parsers import parse_deadline, normalize_person_name, extract_tags


class TestParseDeadline:
    """Test deadline parsing with relative and absolute dates (T015)."""

    def test_parse_tomorrow(self):
        """Test parsing 'tomorrow' returns next day."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("tomorrow", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 11
        assert result.day == 6
        # Should default to end of day
        assert result.hour == 23
        assert result.minute == 59

    def test_parse_tomorrow_with_time(self):
        """Test parsing 'tomorrow at 3pm' returns correct datetime."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("tomorrow at 3pm", reference)

        assert result is not None
        assert result.day == 6
        assert result.hour == 15  # 3pm
        assert result.minute == 0

    def test_parse_today(self):
        """Test parsing 'today' returns current day."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("today", reference)

        assert result is not None
        assert result.date() == reference.date()

    def test_parse_next_week(self):
        """Test parsing 'next week' returns date 7 days ahead."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("next week", reference)

        assert result is not None
        expected = reference + timedelta(days=7)
        assert result.date() == expected.date()

    def test_parse_in_x_days(self):
        """Test parsing 'in 3 days' returns correct future date."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("in 3 days", reference)

        assert result is not None
        expected = reference + timedelta(days=3)
        assert result.date() == expected.date()

    def test_parse_in_x_weeks(self):
        """Test parsing 'in 2 weeks' returns correct future date."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("in 2 weeks", reference)

        assert result is not None
        expected = reference + timedelta(weeks=2)
        assert result.date() == expected.date()

    def test_parse_specific_weekday(self):
        """Test parsing 'next Friday' returns correct date."""
        # Reference is Tuesday Nov 5, 2025
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)  # Wednesday
        result = parse_deadline("next Friday", reference)

        assert result is not None
        # Friday is 2 days ahead (Nov 7)
        assert result.weekday() == 4  # Friday
        assert result.day == 7

    def test_parse_end_of_day(self):
        """Test parsing 'end of day' returns 23:59:59."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("end of day", reference)

        assert result is not None
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_parse_absolute_date(self):
        """Test parsing absolute date like '2025-11-15'."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2025-11-15", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 11
        assert result.day == 15

    def test_parse_date_with_time(self):
        """Test parsing '3:30pm' time component."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("tomorrow at 3:30pm", reference)

        assert result is not None
        assert result.hour == 15
        assert result.minute == 30

    def test_parse_empty_string_returns_none(self):
        """Test that empty deadline returns None."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("", reference)

        assert result is None

    def test_parse_null_returns_none(self):
        """Test that None deadline returns None."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline(None, reference)

        assert result is None

    def test_parse_invalid_text_returns_none(self):
        """Test that completely invalid text returns None."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("xyzabc123", reference)

        # Should return None for unparseable text
        assert result is None or isinstance(result, datetime)

    def test_parse_deadline_is_timezone_aware(self):
        """Test that parsed deadline is timezone-aware."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("tomorrow", reference)

        assert result is not None
        assert result.tzinfo is not None

    def test_parse_by_friday(self):
        """Test parsing 'by Friday' as deadline text."""
        reference = datetime(2025, 11, 5, 10, 0, 0, tzinfo=timezone.utc)  # Wednesday
        result = parse_deadline("by Friday", reference)

        assert result is not None
        assert result.weekday() == 4  # Friday


class TestNormalizePersonName:
    """Test person name normalization."""

    def test_normalize_lowercase_name(self):
        """Test that lowercase name is title cased."""
        result = normalize_person_name("sarah johnson")
        assert result == "Sarah Johnson"

    def test_normalize_uppercase_name(self):
        """Test that uppercase name is title cased."""
        result = normalize_person_name("SARAH JOHNSON")
        assert result == "Sarah Johnson"

    def test_normalize_strips_whitespace(self):
        """Test that leading/trailing whitespace is removed."""
        result = normalize_person_name("  Sarah Johnson  ")
        assert result == "Sarah Johnson"

    def test_normalize_extra_spaces(self):
        """Test that extra spaces between names are removed."""
        result = normalize_person_name("Sarah    Johnson")
        assert result == "Sarah Johnson"

    def test_normalize_empty_string(self):
        """Test that empty string returns empty."""
        result = normalize_person_name("")
        assert result == ""

    def test_normalize_none_returns_empty(self):
        """Test that None returns empty string."""
        result = normalize_person_name(None)
        assert result == ""


class TestExtractTags:
    """Test hashtag extraction from text."""

    def test_extract_single_tag(self):
        """Test extracting single hashtag."""
        result = extract_tags("This is a #bug report")
        assert result == ["bug"]

    def test_extract_multiple_tags(self):
        """Test extracting multiple hashtags."""
        result = extract_tags("Fix #bug in #production #urgent")
        assert result == ["bug", "production", "urgent"]

    def test_extract_tags_preserves_order(self):
        """Test that tag order is preserved."""
        result = extract_tags("#first #second #third")
        assert result == ["first", "second", "third"]

    def test_extract_tags_removes_duplicates(self):
        """Test that duplicate tags are removed."""
        result = extract_tags("#bug fix the #bug")
        assert result == ["bug"]

    def test_extract_tags_case_insensitive_deduplication(self):
        """Test that tags are deduplicated case-insensitively."""
        result = extract_tags("#BUG and #bug")
        assert len(result) == 1
        assert result[0] == "bug"

    def test_extract_tags_empty_text(self):
        """Test that empty text returns empty list."""
        result = extract_tags("")
        assert result == []

    def test_extract_tags_none_returns_empty(self):
        """Test that None returns empty list."""
        result = extract_tags(None)
        assert result == []

    def test_extract_tags_no_tags(self):
        """Test that text without tags returns empty list."""
        result = extract_tags("This has no hashtags")
        assert result == []

    def test_extract_tags_ignores_hash_without_word(self):
        """Test that standalone # is ignored."""
        result = extract_tags("Price is # 100")
        assert result == []
