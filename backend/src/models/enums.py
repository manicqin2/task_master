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
