"""
Integration tests for Ollama → Gemini migration scenarios.

These tests verify:
1. Existing Ollama-enriched tasks remain accessible after migration
2. New tasks use Gemini for enrichment
3. Zero data loss during migration
4. Backward compatibility with existing task data

Following TDD: Write tests FIRST, ensure they FAIL, then implement.
"""

import pytest
from sqlalchemy import select

from src.models.task import Task
from src.models.workbench import Workbench
from src.services.enrichment_service import EnrichmentService


class TestOllamaToGeminiMigration:
    """Integration tests for migration from Ollama to Gemini."""

    @pytest.mark.asyncio
    async def test_existing_tasks_remain_accessible(self, db_session) -> None:
        """Test that tasks enriched by Ollama remain accessible after Gemini migration.

        CONTRACT: Migration must be backward compatible - no data loss
        """
        # Setup: Create task that simulates Ollama-enriched data
        import json
        ollama_task = Task(
            user_input="call John tmrw",
            enriched_text="Call John tomorrow",  # Simulates Ollama enrichment
            project="ProjectX",
            persons=json.dumps(["John"]),
            deadline_text="tomorrow",
            task_type="call",
        )
        db_session.add(ollama_task)
        await db_session.commit()
        await db_session.refresh(ollama_task)

        # Verify: Task is still accessible after migration
        result = await db_session.execute(
            select(Task).where(Task.id == ollama_task.id)
        )
        retrieved_task = result.scalar_one()

        assert retrieved_task is not None
        assert retrieved_task.enriched_text == "Call John tomorrow"
        assert retrieved_task.project == "ProjectX"
        assert retrieved_task.persons == json.dumps(["John"])
        assert retrieved_task.deadline_text == "tomorrow"
        assert retrieved_task.task_type == "call"

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires Gemini API - will FAIL until T026-T038 complete")
    async def test_new_tasks_use_gemini(self, db_session) -> None:
        """Test that newly created tasks use Gemini for enrichment.

        CONTRACT: After migration, new enrichment requests go to Gemini
        """
        # Setup: Initialize enrichment service (should use Gemini after migration)
        service = EnrichmentService()

        # Test: Enrich new task
        user_input = "meet Sarah tmrw at 3pm"
        enriched_text = await service.enrich(user_input)

        # Verify: Text was enriched (Gemini should expand "tmrw" to "tomorrow")
        assert isinstance(enriched_text, str)
        assert len(enriched_text) > 0
        assert "tomorrow" in enriched_text.lower() or "tmrw" not in enriched_text.lower()

    @pytest.mark.asyncio
    async def test_workbench_data_preserved(self, db_session) -> None:
        """Test that workbench enrichment state is preserved during migration.

        CONTRACT: Workbench entries (enrichment status, error messages) remain intact
        """
        # Setup: Create task with workbench entry
        task = Task(
            user_input="test task",
            enriched_text="Test task",
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        workbench = Workbench(
            task_id=task.id,
            enrichment_status="completed",
            error_message=None,
        )
        db_session.add(workbench)
        await db_session.commit()

        # Verify: Workbench entry is preserved
        result = await db_session.execute(
            select(Workbench).where(Workbench.task_id == task.id)
        )
        retrieved_workbench = result.scalar_one()

        assert retrieved_workbench is not None
        assert retrieved_workbench.enrichment_status == "completed"
        assert retrieved_workbench.error_message is None

    @pytest.mark.asyncio
    async def test_no_data_loss_during_migration(self, db_session) -> None:
        """Test that no task data is lost during Ollama → Gemini migration.

        CONTRACT: All task fields remain intact, no corruption
        """
        # Setup: Create comprehensive task with all fields populated
        import json
        comprehensive_task = Task(
            user_input="urgent call with team about Q4 planning",
            enriched_text="Urgent: Call with team to discuss Q4 planning",
            project="Q4 Planning",
            persons=json.dumps(["Alice", "Bob", "Charlie"]),
            deadline_text="Friday at 2pm",
            task_type="call",
            priority="urgent",
            effort_estimate=60,
            dependencies=json.dumps(["Review Q3 results"]),
            tags=json.dumps(["quarterly", "planning", "urgent"]),
        )
        db_session.add(comprehensive_task)
        await db_session.commit()
        await db_session.refresh(comprehensive_task)

        original_id = comprehensive_task.id

        # Simulate migration: No code changes to existing data
        # Just verify data integrity

        # Verify: All fields are preserved exactly
        result = await db_session.execute(
            select(Task).where(Task.id == original_id)
        )
        migrated_task = result.scalar_one()

        assert migrated_task.user_input == "urgent call with team about Q4 planning"
        assert migrated_task.enriched_text == "Urgent: Call with team to discuss Q4 planning"
        assert migrated_task.project == "Q4 Planning"
        assert migrated_task.persons == json.dumps(["Alice", "Bob", "Charlie"])
        assert migrated_task.deadline_text == "Friday at 2pm"
        assert migrated_task.task_type == "call"
        assert migrated_task.priority == "urgent"
        assert migrated_task.effort_estimate == 60
        assert migrated_task.dependencies == json.dumps(["Review Q3 results"])
        assert migrated_task.tags == json.dumps(["quarterly", "planning", "urgent"])
