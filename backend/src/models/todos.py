"""Todos model for task execution workflow."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .enums import TodoStatus
from . import Base


class Todo(Base):
    """Todo entry for task execution workflow."""

    __tablename__ = "todos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    status: Mapped[TodoStatus] = mapped_column(
        SQLEnum(TodoStatus), nullable=False, default=TodoStatus.OPEN
    )
    position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
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
    task: Mapped["Task"] = relationship("Task", back_populates="todo")

    def __repr__(self) -> str:
        return f"<Todo(id={self.id}, task_id={self.task_id}, status={self.status})>"
