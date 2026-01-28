"""Unit tests for backend date parsing utilities.

Feature 008: Task Management UI Enhancements - User Story 2
Tests verify backend date parsing and validation using python-dateutil.
"""
from datetime import datetime, timezone
import pytest

from src.lib.metadata_parsers import parse_deadline


class TestDeadlineParsing:
    """Test deadline parsing from natural language to datetime."""

    def test_parse_iso_date_format(self):
        """Test parsing ISO date format YYYY-MM-DD."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2025-12-31", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 12
        assert result.day == 31

    def test_parse_iso_date_with_time(self):
        """Test parsing ISO datetime format."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2025-12-31T23:59:59", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 12
        assert result.day == 31

    def test_parse_relative_date_tomorrow(self):
        """Test parsing 'tomorrow' relative to reference date."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("tomorrow", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 6
        assert result.day == 16

    def test_parse_relative_date_in_n_days(self):
        """Test parsing 'in N days' expressions."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("in 3 days", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 6
        assert result.day == 18

    def test_parse_next_weekday(self):
        """Test parsing 'next Friday' expressions."""
        # Sunday June 15, 2025
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("next Friday", reference)

        assert result is not None
        # Next Friday should be June 20
        assert result.year == 2025
        assert result.month == 6
        assert result.day == 20

    def test_parse_next_same_weekday_adds_7_days(self):
        """Test that 'next Monday' on Monday adds 7 days (FR-013)."""
        # Monday June 16, 2025
        reference = datetime(2025, 6, 16, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("next Monday", reference)

        assert result is not None
        # Should be next week Monday (June 23), not today
        assert result.year == 2025
        assert result.month == 6
        assert result.day == 23

    def test_parse_in_weeks(self):
        """Test parsing 'in N weeks' expressions."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("in 2 weeks", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 6
        assert result.day == 29

    def test_parse_next_month(self):
        """Test parsing 'next month' expressions."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("next month", reference)

        assert result is not None
        assert result.year == 2025
        assert result.month == 7
        # Day should be approximately the same

    def test_parse_invalid_input_returns_none(self):
        """Test that invalid input returns None."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("invalid gibberish", reference)

        assert result is None

    def test_parse_empty_string_returns_none(self):
        """Test that empty string returns None."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("", reference)

        assert result is None

    def test_parse_none_returns_none(self):
        """Test that None input returns None."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline(None, reference)

        assert result is None

    def test_parsed_deadline_has_timezone(self):
        """Test that parsed deadlines include timezone info."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2025-12-31", reference)

        assert result is not None
        assert result.tzinfo is not None

    def test_parse_case_insensitive(self):
        """Test that parsing is case-insensitive."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("TOMORROW", reference)

        assert result is not None
        assert result.day == 16

    def test_parse_handles_leading_trailing_whitespace(self):
        """Test that parser handles whitespace gracefully."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("  tomorrow  ", reference)

        assert result is not None
        assert result.day == 16

    def test_parse_date_in_past_is_valid(self):
        """Test that dates in the past are parsed (validation is separate)."""
        reference = datetime(2025, 6, 15, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2020-01-01", reference)

        assert result is not None
        assert result.year == 2020

    def test_parse_leap_year_date(self):
        """Test parsing leap year dates."""
        reference = datetime(2024, 2, 1, 10, 0, 0, tzinfo=timezone.utc)
        result = parse_deadline("2024-02-29", reference)

        assert result is not None
        assert result.year == 2024
        assert result.month == 2
        assert result.day == 29

    def test_reference_time_affects_relative_parsing(self):
        """Test that reference time correctly affects relative date parsing."""
        ref1 = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        ref2 = datetime(2025, 12, 31, 10, 0, 0, tzinfo=timezone.utc)

        result1 = parse_deadline("in 1 day", ref1)
        result2 = parse_deadline("in 1 day", ref2)

        assert result1 is not None
        assert result2 is not None
        assert result1.month == 1
        assert result1.day == 2
        assert result2.month == 1  # Rolls over to next year
        assert result2.day == 1
