"""Workbench model for task enrichment workflow."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .enums import EnrichmentStatus
from . import Base


class Workbench(Base):
    """Workbench entry for task enrichment workflow."""

    __tablename__ = "workbench"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    enrichment_status: Mapped[EnrichmentStatus] = mapped_column(
        SQLEnum(EnrichmentStatus), nullable=False, default=EnrichmentStatus.PENDING
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_suggestions: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON string
    moved_to_todos_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    # Relationship to task
    task: Mapped["Task"] = relationship("Task", back_populates="workbench")

    def __repr__(self) -> str:
        return f"<Workbench(id={self.id}, task_id={self.task_id}, status={self.enrichment_status})>"
