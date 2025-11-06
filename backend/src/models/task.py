"""Task model for storing user tasks and enrichment status."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum as SQLEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .enums import EnrichmentStatus, Priority, TaskStatus, TaskType
from . import Base


class Task(Base):
    """Task entity with enrichment tracking."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    enriched_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus), nullable=False, default=TaskStatus.OPEN
    )
    enrichment_status: Mapped[EnrichmentStatus] = mapped_column(
        SQLEnum(EnrichmentStatus), nullable=False, default=EnrichmentStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata fields (Feature 004)
    project: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    persons: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    task_type: Mapped[Optional[TaskType]] = mapped_column(
        SQLEnum(TaskType), nullable=True
    )
    priority: Mapped[Optional[Priority]] = mapped_column(
        SQLEnum(Priority), nullable=True
    )
    deadline_text: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    deadline_parsed: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    effort_estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dependencies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    metadata_suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    extracted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    requires_attention: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, status={self.status}, enrichment={self.enrichment_status})>"
