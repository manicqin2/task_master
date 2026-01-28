"""Task model for storing user tasks and metadata."""
import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .workbench import Workbench
    from .todos import Todo


class Task(Base):
    """Core task entity with metadata."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    enriched_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Metadata fields (Feature 004)
    project: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    persons: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    task_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Now a string
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="Low")  # Feature 008: Defaults to "Low"
    deadline_text: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    deadline_parsed: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    effort_estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dependencies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    extracted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    requires_attention: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    workbench: Mapped[Optional["Workbench"]] = relationship(
        "Workbench", back_populates="task", uselist=False, cascade="all, delete-orphan"
    )
    todo: Mapped[Optional["Todo"]] = relationship(
        "Todo", back_populates="task", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, project={self.project})>"
