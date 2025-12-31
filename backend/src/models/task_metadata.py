"""Pydantic schemas for task metadata extraction."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class FieldSuggestion(BaseModel):
    """Suggestion for a metadata field with confidence score."""

    value: Optional[str | list[str]] = None
    confidence: float = Field(ge=0.0, le=1.0)
    alternatives: Optional[list[str]] = None


class MetadataExtractionResponse(BaseModel):
    """LLM response for metadata extraction with confidence scores."""

    project: Optional[str] = Field(None, max_length=100)
    project_confidence: float = Field(ge=0.0, le=1.0)

    persons: list[str] = Field(default_factory=list)
    persons_confidence: float = Field(ge=0.0, le=1.0)

    deadline: Optional[str] = Field(None, max_length=200)
    deadline_confidence: float = Field(ge=0.0, le=1.0)

    task_type: Optional[str] = Field(None, max_length=50)
    task_type_confidence: float = Field(ge=0.0, le=1.0)

    priority: Optional[str] = Field(None, max_length=20)
    priority_confidence: float = Field(ge=0.0, le=1.0)

    effort_estimate: Optional[int] = None
    effort_confidence: float = Field(ge=0.0, le=1.0)

    dependencies: list[str] = Field(default_factory=list)
    dependencies_confidence: float = Field(ge=0.0, le=1.0)

    tags: list[str] = Field(default_factory=list)
    tags_confidence: float = Field(ge=0.0, le=1.0)

    chain_of_thought: Optional[str] = None

    @field_validator("persons", "dependencies", "tags")
    @classmethod
    def validate_non_empty_strings(cls, v: list[str]) -> list[str]:
        """Ensure list items are non-empty strings."""
        return [item.strip() for item in v if item and item.strip()]


class TaskMetadataResponse(BaseModel):
    """Task metadata for API responses."""

    project: Optional[str] = None
    persons: list[str] = Field(default_factory=list)
    task_type: Optional[str] = None
    priority: Optional[str] = None
    deadline_text: Optional[str] = None
    deadline_parsed: Optional[datetime] = None
    effort_estimate: Optional[int] = None
    dependencies: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    extracted_at: Optional[datetime] = None
    requires_attention: bool = False

    class Config:
        """Pydantic config."""
        from_attributes = True


class TaskMetadataUpdate(BaseModel):
    """Schema for updating task metadata manually."""

    project: Optional[str] = Field(None, max_length=100)
    persons: Optional[list[str]] = None
    task_type: Optional[str] = Field(None, max_length=50)
    priority: Optional[str] = Field(None, max_length=20)
    deadline_text: Optional[str] = Field(None, max_length=200)
    deadline_parsed: Optional[datetime] = None
    effort_estimate: Optional[int] = Field(None, gt=0)
    dependencies: Optional[list[str]] = None
    tags: Optional[list[str]] = None

    @field_validator("persons", "dependencies", "tags")
    @classmethod
    def validate_non_empty_strings(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        """Ensure list items are non-empty strings."""
        if v is None:
            return None
        return [item.strip() for item in v if item and item.strip()]
