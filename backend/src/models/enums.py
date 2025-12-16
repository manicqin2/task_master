"""Enumerations for task management."""
from enum import Enum


class TodoStatus(str, Enum):
    """Todo task status (for todos table)."""

    OPEN = "open"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class EnrichmentStatus(str, Enum):
    """Task enrichment processing status (for workbench table)."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# TaskType and Priority are now stored as strings for flexibility
# Common values (for reference, not enforced at DB level):
# TaskType: meeting, call, email, review, development, research, administrative, other
# Priority: low, normal, high, urgent
