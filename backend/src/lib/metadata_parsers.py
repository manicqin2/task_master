"""Utilities for parsing metadata from natural language text."""
import re
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from dateutil import parser as dateutil_parser
from dateutil.relativedelta import relativedelta


def parse_deadline(deadline_text: str, reference_time: Optional[datetime] = None) -> Optional[datetime]:
    """
    Parse a deadline string into a timezone-aware datetime.

    Supports:
    - Relative dates: "tomorrow", "next week", "in 3 days"
    - Absolute dates: "2025-11-15", "November 15"
    - Times: "3pm", "15:00", "at 3:30pm"
    - Combined: "tomorrow at 3pm", "next Friday at 2:30pm"

    Args:
        deadline_text: The natural language deadline string
        reference_time: Reference time for relative dates (defaults to now in UTC)

    Returns:
        Parsed datetime in UTC, or None if parsing fails
    """
    if not deadline_text or not deadline_text.strip():
        return None

    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    elif reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    text = deadline_text.lower().strip()

    # Try to handle common relative date patterns first
    result = _parse_relative_date(text, reference_time)
    if result:
        return result

    # Fall back to dateutil parser for absolute dates
    try:
        parsed = dateutil_parser.parse(deadline_text, fuzzy=True, default=reference_time)
        # Ensure timezone-aware
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except (ValueError, TypeError, OverflowError):
        return None


def _parse_relative_date(text: str, reference_time: datetime) -> Optional[datetime]:
    """Parse relative date expressions like 'tomorrow', 'next week', etc."""
    # Today
    if text in ("today", "now"):
        return reference_time

    # Tomorrow
    if "tomorrow" in text:
        base = reference_time + timedelta(days=1)
        return _apply_time_if_present(text, base)

    # Yesterday (for completeness, though likely not used for deadlines)
    if "yesterday" in text:
        base = reference_time - timedelta(days=1)
        return _apply_time_if_present(text, base)

    # Next/this week
    if "next week" in text or "this week" in text:
        days_ahead = 7 if "next week" in text else 0
        base = reference_time + timedelta(days=days_ahead)
        return _apply_time_if_present(text, base)

    # Next/this month
    if "next month" in text:
        base = reference_time + relativedelta(months=1)
        return _apply_time_if_present(text, base)

    # In X days/weeks/months
    in_pattern = r'in (\d+) (day|week|month|hour)s?'
    match = re.search(in_pattern, text)
    if match:
        count = int(match.group(1))
        unit = match.group(2)
        if unit == "day":
            base = reference_time + timedelta(days=count)
        elif unit == "week":
            base = reference_time + timedelta(weeks=count)
        elif unit == "month":
            base = reference_time + relativedelta(months=count)
        elif unit == "hour":
            base = reference_time + timedelta(hours=count)
        else:
            return None
        return _apply_time_if_present(text, base)

    # Specific day of week (e.g., "next Friday", "this Monday")
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day_name in enumerate(weekdays):
        if day_name in text:
            days_ahead = (i - reference_time.weekday()) % 7
            if days_ahead == 0 and "next" in text:
                days_ahead = 7
            elif days_ahead == 0:
                days_ahead = 0  # "this Monday" when today is Monday
            base = reference_time + timedelta(days=days_ahead)
            return _apply_time_if_present(text, base)

    # End of day/week/month
    if "end of day" in text or "eod" in text:
        return reference_time.replace(hour=23, minute=59, second=59)

    if "end of week" in text or "eow" in text:
        days_to_friday = (4 - reference_time.weekday()) % 7
        base = reference_time + timedelta(days=days_to_friday)
        return base.replace(hour=23, minute=59, second=59)

    if "end of month" in text or "eom" in text:
        next_month = reference_time + relativedelta(months=1)
        last_day = next_month.replace(day=1) - timedelta(days=1)
        return last_day.replace(hour=23, minute=59, second=59)

    return None


def _apply_time_if_present(text: str, base_date: datetime) -> datetime:
    """Extract time component from text and apply it to base_date."""
    # Try to find time patterns like "3pm", "15:00", "at 3:30pm"
    # Pattern 1: Hour:Minute with optional AM/PM
    match = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)?', text, re.IGNORECASE)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        meridiem = match.group(3)

        # Handle AM/PM
        if meridiem and meridiem.lower() == 'pm' and hour < 12:
            hour += 12
        elif meridiem and meridiem.lower() == 'am' and hour == 12:
            hour = 0

        return base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

    # Pattern 2: Hour with AM/PM (no minutes)
    match = re.search(r'(\d{1,2})\s*(am|pm)', text, re.IGNORECASE)
    if match:
        hour = int(match.group(1))
        meridiem = match.group(2)

        # Handle AM/PM
        if meridiem.lower() == 'pm' and hour < 12:
            hour += 12
        elif meridiem.lower() == 'am' and hour == 12:
            hour = 0

        return base_date.replace(hour=hour, minute=0, second=0, microsecond=0)

    # No time found, use end of day as default for deadline
    return base_date.replace(hour=23, minute=59, second=59, microsecond=0)


def normalize_person_name(name: str) -> str:
    """
    Normalize a person name for consistency.

    - Strips whitespace
    - Title cases (e.g., "john doe" -> "John Doe")
    - Removes extra spaces

    Args:
        name: The raw person name

    Returns:
        Normalized name
    """
    if not name:
        return ""

    # Strip and normalize spaces
    name = re.sub(r'\s+', ' ', name.strip())

    # Title case (handles "john doe" -> "John Doe")
    return name.title()


def extract_tags(text: str) -> list[str]:
    """
    Extract hashtags from text.

    Args:
        text: The input text

    Returns:
        List of unique tags (without # prefix)
    """
    if not text:
        return []

    # Find all hashtags (word characters after #)
    tags = re.findall(r'#(\w+)', text)

    # Return unique tags, preserving order
    seen = set()
    unique_tags = []
    for tag in tags:
        tag_lower = tag.lower()
        if tag_lower not in seen:
            seen.add(tag_lower)
            unique_tags.append(tag_lower)

    return unique_tags
