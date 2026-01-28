"""Unit tests for Task priority default behavior.

Feature 008: Task Management UI Enhancements - User Story 1
Tests verify that tasks automatically default to "Low" priority when not explicitly set.
"""
import pytest

from src.models.task import Task


class TestTaskPriorityDefaults:
    """Test Task model priority default behavior."""

    def test_priority_defaults_to_low_when_not_specified(self):
        """Test that new tasks default to 'Low' priority when not explicitly set."""
        # Arrange & Act
        task = Task(
            user_input="test task without priority",
            project="General"
        )

        # Assert
        assert task.priority == "Low"

    def test_priority_can_be_explicitly_set_to_urgent(self):
        """Test that priority can be explicitly set to Urgent."""
        # Arrange & Act
        task = Task(
            user_input="urgent task",
            project="General",
            priority="Urgent"
        )

        # Assert
        assert task.priority == "Urgent"

    def test_priority_can_be_explicitly_set_to_high(self):
        """Test that priority can be explicitly set to High."""
        # Arrange & Act
        task = Task(
            user_input="high priority task",
            project="General",
            priority="High"
        )

        # Assert
        assert task.priority == "High"

    def test_priority_can_be_explicitly_set_to_normal(self):
        """Test that priority can be explicitly set to Normal."""
        # Arrange & Act
        task = Task(
            user_input="normal priority task",
            project="General",
            priority="Normal"
        )

        # Assert
        assert task.priority == "Normal"

    def test_priority_can_be_explicitly_set_to_low(self):
        """Test that priority can be explicitly set to Low."""
        # Arrange & Act
        task = Task(
            user_input="low priority task",
            project="General",
            priority="Low"
        )

        # Assert
        assert task.priority == "Low"

    def test_priority_none_coalesces_to_low_in_ui(self):
        """Test that null priority should be treated as 'Low' in UI layer."""
        # Arrange & Act
        task = Task(
            user_input="task with explicit null priority",
            project="General",
            priority=None
        )

        # Assert - Model allows None, UI should coalesce to "Low"
        # This test verifies backward compatibility with old data
        assert task.priority is None or task.priority == "Low"
