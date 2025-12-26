"""Three table schema: tasks, workbench, todos

Refactor from single tasks table to three-table architecture:
- tasks: immutable task data
- workbench: enrichment workflow state
- todos: execution workflow state

This migration preserves all existing data while restructuring the schema.

Revision ID: 005
Revises: 004
Create Date: 2025-11-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite
from sqlalchemy import text
from datetime import datetime, timezone
import uuid

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database to three-table schema with data preservation."""

    conn = op.get_bind()

    # T022: Pre-migration validation
    print("=== PRE-MIGRATION VALIDATION ===")

    # Check if migration already applied (idempotency check - T031)
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'workbench' in existing_tables or 'todos' in existing_tables:
        raise RuntimeError(
            "Migration 005 already applied: workbench or todos table already exists. "
            "Check alembic_version table or restore from backup if migration is corrupted."
        )

    # Validate enum values (T022)
    # Note: In the old schema, enrichment_status and status were columns on tasks table
    # We need to check if tasks table exists and has data
    if 'tasks' in existing_tables:
        # Capture baseline record counts
        result = conn.execute(text("SELECT COUNT(*) FROM tasks"))
        baseline_task_count = result.scalar()
        print(f"Baseline task count: {baseline_task_count}")

        # Validate no NULL primary keys (T022)
        result = conn.execute(text("SELECT COUNT(*) FROM tasks WHERE id IS NULL OR id = ''"))
        invalid_ids = result.scalar()
        if invalid_ids > 0:
            raise ValueError(f"Found {invalid_ids} tasks with invalid IDs")

        print("✓ Pre-migration validation passed")
    else:
        print("No existing tasks table - fresh installation")
        baseline_task_count = 0

    # T023: Create workbench table
    print("\n=== CREATING WORKBENCH TABLE ===")
    op.create_table(
        'workbench',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), nullable=False, unique=True),
        sa.Column('enrichment_status', sa.String(20), nullable=False, default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_suggestions', sa.Text(), nullable=True),  # JSON string
        sa.Column('moved_to_todos_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),

        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    )
    print("✓ Workbench table created")

    # T024: Create todos table
    print("\n=== CREATING TODOS TABLE ===")
    op.create_table(
        'todos',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('task_id', sa.String(36), nullable=False, unique=True),
        sa.Column('status', sa.String(20), nullable=False, default='open'),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),

        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    )
    print("✓ Todos table created")

    # T025: Migrate data to workbench table
    # Note: This assumes the old schema had enrichment_status column
    # If upgrading from a fresh install, there's no data to migrate
    if baseline_task_count > 0:
        print("\n=== MIGRATING DATA TO WORKBENCH ===")

        # Check if old columns exist
        columns = [col['name'] for col in inspector.get_columns('tasks')]
        has_enrichment_status = 'enrichment_status' in columns
        has_error_message = 'error_message' in columns

        if has_enrichment_status:
            # Migrate all tasks to workbench (every task should have enrichment state)
            conn.execute(text("""
                INSERT INTO workbench (id, task_id, enrichment_status, error_message, created_at, updated_at)
                SELECT
                    lower(hex(randomblob(16))),  -- Generate UUID
                    id,
                    COALESCE(enrichment_status, 'pending'),
                    error_message,
                    created_at,
                    datetime('now')
                FROM tasks
            """))

            result = conn.execute(text("SELECT COUNT(*) FROM workbench"))
            workbench_count = result.scalar()
            print(f"✓ Migrated {workbench_count} tasks to workbench")
        else:
            print("⚠ No enrichment_status column found - skipping workbench migration")

    # T026: Migrate data to todos table with position assignment
    if baseline_task_count > 0:
        print("\n=== MIGRATING DATA TO TODOS ===")

        columns = [col['name'] for col in inspector.get_columns('tasks')]
        has_status = 'status' in columns

        if has_status:
            # Migrate only tasks that have status set (tasks in todo list)
            # Assign positions based on created_at order (T015)
            conn.execute(text("""
                INSERT INTO todos (id, task_id, status, position, created_at, updated_at)
                SELECT
                    lower(hex(randomblob(16))),  -- Generate UUID
                    id,
                    status,
                    ROW_NUMBER() OVER (ORDER BY created_at) as position,
                    created_at,
                    datetime('now')
                FROM tasks
                WHERE status IS NOT NULL
            """))

            result = conn.execute(text("SELECT COUNT(*) FROM todos"))
            todos_count = result.scalar()
            print(f"✓ Migrated {todos_count} tasks to todos")
        else:
            print("⚠ No status column found - skipping todos migration")

    # T027: Set moved_to_todos_at for tasks in both tables
    if baseline_task_count > 0:
        print("\n=== SETTING MOVED_TO_TODOS_AT TIMESTAMPS ===")

        # For tasks that exist in both workbench and todos, set moved_to_todos_at
        conn.execute(text("""
            UPDATE workbench
            SET moved_to_todos_at = (
                SELECT created_at FROM todos WHERE todos.task_id = workbench.task_id
            )
            WHERE task_id IN (SELECT task_id FROM todos)
        """))

        result = conn.execute(text(
            "SELECT COUNT(*) FROM workbench WHERE moved_to_todos_at IS NOT NULL"
        ))
        moved_count = result.scalar()
        print(f"✓ Set moved_to_todos_at for {moved_count} tasks")

    # T028: Drop old columns from tasks table
    # IMPORTANT: Always check for old columns, even with empty database
    print("\n=== DROPPING OLD COLUMNS ===")

    columns = [col['name'] for col in inspector.get_columns('tasks')]

    # SQLite doesn't support DROP COLUMN directly, need to recreate table
    # But only if old columns exist
    if 'enrichment_status' in columns or 'status' in columns or 'error_message' in columns:
        print("⚠ Dropping columns requires table recreation in SQLite")
        print("  Columns enrichment_status, status, error_message will be removed")

        # Create new tasks table without old columns
        op.create_table(
            'tasks_new',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_input', sa.Text(), nullable=False),
            sa.Column('enriched_text', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),

            # Metadata fields (keep these)
            sa.Column('project', sa.String(100), nullable=True),
            sa.Column('persons', sa.Text(), nullable=True),
            sa.Column('task_type', sa.String(50), nullable=True),
            sa.Column('priority', sa.String(20), nullable=True),
            sa.Column('deadline_text', sa.String(200), nullable=True),
            sa.Column('deadline_parsed', sa.DateTime(timezone=True), nullable=True),
            sa.Column('effort_estimate', sa.Integer(), nullable=True),
            sa.Column('dependencies', sa.Text(), nullable=True),
            sa.Column('tags', sa.Text(), nullable=True),
            sa.Column('extracted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('requires_attention', sa.Boolean(), nullable=False, default=False),
        )

        # Copy data to new table (excluding old columns)
        conn.execute(text("""
            INSERT INTO tasks_new (
                id, user_input, enriched_text, created_at, updated_at,
                project, persons, task_type, priority, deadline_text, deadline_parsed,
                effort_estimate, dependencies, tags, extracted_at, requires_attention
            )
            SELECT
                id, user_input, enriched_text, created_at, updated_at,
                project, persons, task_type, priority, deadline_text, deadline_parsed,
                effort_estimate, dependencies, tags, extracted_at, requires_attention
            FROM tasks
        """))

        # Drop old table and rename new one
        op.drop_table('tasks')
        op.rename_table('tasks_new', 'tasks')

        print("✓ Old columns removed from tasks table")
    else:
        print("✓ No old columns to remove")

    # T029: Create indexes
    print("\n=== CREATING INDEXES ===")

    # Workbench indexes
    op.create_index('ix_workbench_task_id', 'workbench', ['task_id'])
    op.create_index('ix_workbench_enrichment_status', 'workbench', ['enrichment_status'])
    op.create_index('ix_workbench_moved_to_todos_at', 'workbench', ['moved_to_todos_at'])

    # Todos indexes
    op.create_index('ix_todos_task_id', 'todos', ['task_id'])
    op.create_index('ix_todos_status', 'todos', ['status'])
    op.create_index('ix_todos_position', 'todos', ['position'])

    # Tasks indexes
    op.create_index('ix_tasks_project', 'tasks', ['project'])
    op.create_index('ix_tasks_deadline_parsed', 'tasks', ['deadline_parsed'])

    print("✓ All indexes created")

    # T030: Post-migration validation
    print("\n=== POST-MIGRATION VALIDATION ===")

    # Verify record counts match
    result = conn.execute(text("SELECT COUNT(*) FROM tasks"))
    final_task_count = result.scalar()

    result = conn.execute(text("SELECT COUNT(*) FROM workbench"))
    final_workbench_count = result.scalar()

    result = conn.execute(text("SELECT COUNT(*) FROM todos"))
    final_todos_count = result.scalar()

    print(f"Final counts:")
    print(f"  Tasks: {final_task_count} (baseline: {baseline_task_count})")
    print(f"  Workbench: {final_workbench_count}")
    print(f"  Todos: {final_todos_count}")

    if final_task_count != baseline_task_count:
        raise RuntimeError(
            f"Data loss detected! Task count mismatch: {baseline_task_count} → {final_task_count}"
        )

    # Verify foreign key integrity (T030)
    result = conn.execute(text("""
        SELECT COUNT(*) FROM workbench
        WHERE task_id NOT IN (SELECT id FROM tasks)
    """))
    orphaned_workbench = result.scalar()

    result = conn.execute(text("""
        SELECT COUNT(*) FROM todos
        WHERE task_id NOT IN (SELECT id FROM tasks)
    """))
    orphaned_todos = result.scalar()

    if orphaned_workbench > 0:
        raise RuntimeError(f"Found {orphaned_workbench} orphaned workbench entries!")

    if orphaned_todos > 0:
        raise RuntimeError(f"Found {orphaned_todos} orphaned todos entries!")

    print("✓ No orphaned records found")
    print("✓ Post-migration validation passed")

    print("\n=== MIGRATION COMPLETE ===")
    print(f"Successfully migrated {baseline_task_count} tasks to three-table architecture")


def downgrade():
    """Downgrade is not supported for this major schema change.

    T032: Recovery instructions:

    If you need to rollback this migration:

    1. Stop the application
    2. Restore from database backup:
       cp data/tasks.db.backup_pre_migration_005 data/tasks.db
    3. Verify backup integrity:
       sqlite3 data/tasks.db "SELECT COUNT(*) FROM tasks;"
    4. Restart application on backup database
    5. Investigate migration failure, fix root cause, retry migration

    Automated downgrade is not implemented due to complexity of merging
    three tables back into one table structure.
    """
    raise NotImplementedError(
        "Cannot downgrade from three-table schema. "
        "Restore from database backup taken before migration instead. "
        "See migration script docstring for recovery procedure."
    )
