"""Enumerations for task management."""
from enum import Enum


class TaskStatus(str, Enum):
    """Task completion status."""

    OPEN = "open"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class EnrichmentStatus(str, Enum):
    """Task enrichment processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    """Type of task based on content."""

    MEETING = "meeting"
    CALL = "call"
    EMAIL = "email"
    REVIEW = "review"
    DEVELOPMENT = "development"
    RESEARCH = "research"
    ADMINISTRATIVE = "administrative"
    OTHER = "other"


class Priority(str, Enum):
    """Task priority level."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
