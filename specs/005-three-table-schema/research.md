# Research & Technical Decisions: Three-Table Schema Architecture

**Feature**: 005-three-table-schema
**Date**: 2025-11-15
**Purpose**: Document all technical research and decisions made for database migration strategy

## Overview

This document captures the technical research and decisions made for refactoring the single-table `tasks` schema into a three-table architecture (`tasks`, `workbench`, `todos`). The primary goal is to separate concerns by lifecycle while maintaining 100% backward compatibility and zero data loss during migration.

---

## Decision 1: Migration Atomicity & Transaction Strategy

### Research Question
How should we ensure the migration either succeeds completely or rolls back fully, preventing partial/corrupted state?

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **SQLite Transactions** | Atomic all-or-nothing, built-in rollback, simple | Locks entire database during migration | ✅ **CHOSEN** |
| **Manual Backup + Restore** | Full control, can retry | Complex, error-prone, slower | ❌ Backup used as safety net, not primary strategy |
| **Dual-write Strategy** | Zero downtime | Complex, requires maintaining both schemas, out of scope | ❌ Rejected per spec constraints |

### Decision

**Use SQLite ACID transactions for atomic migration**

**Rationale**:
- SQLite supports full ACID transactions - entire migration runs in BEGIN/COMMIT block
- If any step fails, ROLLBACK automatically reverts all changes
- Pre-migration validation catches issues before any changes committed
- Maintenance window acceptable per spec assumptions (read-only mode during migration)

**Implementation**:
```python
# Alembic migration pseudo-code
def upgrade():
    # Transaction automatically started by Alembic
    # All DDL and DML operations are transactional

    # Step 1: Validate pre-conditions
    validate_data_integrity()  # Raises exception if issues found

    # Step 2: Create new tables
    op.create_table('workbench', ...)
    op.create_table('todos', ...)

    # Step 3: Migrate data
    migrate_to_workbench()
    migrate_to_todos()

    # Step 4: Drop old columns
    op.drop_column('tasks', 'enrichment_status')
    op.drop_column('tasks', 'status')

    # Step 5: Validate post-conditions
    validate_referential_integrity()

    # Transaction commits automatically if no exceptions
```

**Rollback Strategy**:
- If migration fails: SQLite ROLLBACK restores original state
- Database backup taken before migration as additional safety net
- No automated downgrade migration (restore from backup if needed post-commit)

---

## Decision 2: Foreign Key Enforcement & Cascade Behavior

### Research Question
How should we handle foreign key relationships and what should happen when a task is deleted?

### SQLite Foreign Key Support

**Finding**: SQLite supports foreign keys but they must be explicitly enabled:
```sql
PRAGMA foreign_keys = ON;
```

**Alembic Configuration**: Foreign keys enabled in `alembic/env.py`:
```python
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

### Cascade Options Research

| Option | Behavior | Use Case |
|--------|----------|----------|
| `CASCADE` | Delete child when parent deleted | ✅ **CHOSEN** - Delete workbench/todos when task deleted |
| `RESTRICT` | Prevent parent deletion if children exist | ❌ Violates requirement to allow task deletion |
| `SET NULL` | Set child foreign key to NULL | ❌ task_id is required (not nullable) |
| `NO ACTION` | Deferred constraint check | ❌ Same as RESTRICT for SQLite |

### Decision

**Use CASCADE DELETE for all foreign key relationships**

**Rationale**:
- When a task is deleted, its workbench and todos entries should also be deleted (no orphans)
- Matches spec requirement FR-007: "System MUST configure foreign key constraints with CASCADE DELETE"
- Simplifies deletion logic - no need to manually delete children
- Prevents orphaned records automatically

**Implementation**:
```python
# workbench table foreign key
sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE')

# todos table foreign key
sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE')
```

**SQLAlchemy Model Configuration**:
```python
class Task(Base):
    workbench: Mapped[Optional["Workbench"]] = relationship(
        "Workbench",
        back_populates="task",
        uselist=False,
        cascade="all, delete-orphan"  # Cascade deletes via ORM
    )
    todo: Mapped[Optional["Todo"]] = relationship(
        "Todo",
        back_populates="task",
        uselist=False,
        cascade="all, delete-orphan"
    )
```

---

## Decision 3: Position Initialization for Todos

### Research Question
How should we assign position values to existing tasks when migrating to the todos table?

### Requirements
- Position field is used for drag-drop ordering in todo list (Feature 003)
- Must preserve existing task order
- Position should be an integer (1, 2, 3, ...)

### Options Considered

| Strategy | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Order by created_at** | Preserves chronological order, predictable | May not match user's current order | ✅ **CHOSEN** - Best approximation |
| **Order by id (UUID)** | Deterministic | UUIDs not sequential, arbitrary order | ❌ Doesn't preserve meaningful order |
| **Random assignment** | Simple | Loses order information | ❌ Unacceptable for user experience |
| **Ask user to re-order** | User controls order | Requires UI changes, disrupts migration | ❌ Out of scope |

### Decision

**Assign positions sequentially based on created_at ascending**

**Rationale**:
- Oldest tasks get position 1, newest get highest position
- Preserves chronological order which is a reasonable approximation of user intent
- Deterministic and reproducible
- Users can re-order via drag-drop after migration if desired

**Implementation**:
```python
# Migration pseudo-code
def migrate_to_todos():
    conn = op.get_bind()

    # Query tasks with status (tasks in todo list)
    # ORDER BY created_at to assign positions
    tasks_with_status = conn.execute(
        "SELECT id, status, created_at FROM tasks WHERE status IS NOT NULL ORDER BY created_at"
    ).fetchall()

    # Assign positions: 1, 2, 3, ...
    for position, (task_id, status, created_at) in enumerate(tasks_with_status, start=1):
        conn.execute(
            "INSERT INTO todos (id, task_id, status, position, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (uuid4(), task_id, status, position, created_at, datetime.now(timezone.utc))
        )
```

---

## Decision 4: moved_to_todos_at Timestamp Logic

### Research Question
When should `workbench.moved_to_todos_at` be set during migration?

### Purpose of moved_to_todos_at
- Tracks when a task graduated from enrichment workflow (workbench) to execution workflow (todos)
- Enables future archival strategies (delete old workbench entries with moved_to_todos_at > 90 days)
- Prevents tasks from appearing in both workbench lanes AND todo list simultaneously

### Migration Logic

**Rule**: Set `moved_to_todos_at` for tasks that have BOTH enrichment_status AND status

| Scenario | enrichment_status | status | Action |
|----------|-------------------|--------|--------|
| Task being enriched | pending/processing | NULL | workbench entry only, moved_to_todos_at=NULL |
| Task failed enrichment | failed | NULL | workbench entry only, moved_to_todos_at=NULL |
| Task in todo list | completed | open/completed/archived | workbench + todos entries, moved_to_todos_at=created_at of todos entry |
| Task never enriched | NULL | open | todos entry only (edge case, should not exist) |

### Decision

**Set moved_to_todos_at = todos.created_at when both workbench and todos entries created**

**Rationale**:
- Accurately reflects when task moved to todos during migration
- For existing tasks, we don't have historical "move time", so use created_at as approximation
- Enables future workbench archival logic (can delete workbench entries with moved_to_todos_at set)

**Implementation**:
```python
def migrate_to_workbench_and_todos():
    conn = op.get_bind()

    # Migrate tasks with BOTH enrichment_status AND status
    tasks_with_both = conn.execute(
        "SELECT id, enrichment_status, error_message, status, created_at "
        "FROM tasks WHERE enrichment_status IS NOT NULL AND status IS NOT NULL"
    ).fetchall()

    for task_id, enrich_status, error_msg, status, created_at in tasks_with_both:
        # Create workbench entry with moved_to_todos_at set
        conn.execute(
            "INSERT INTO workbench (id, task_id, enrichment_status, error_message, moved_to_todos_at, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uuid4(), task_id, enrich_status, error_msg, created_at, created_at, datetime.now())
        )

        # Create todos entry
        # ... (position logic from Decision 3)
```

---

## Decision 5: Rollback & Recovery Strategy

### Research Question
What should happen if the migration fails or needs to be rolled back after deployment?

### Backup Strategy

**Pre-Migration Backup**:
```bash
# Before running migration
cp data/tasks.db data/tasks.db.backup_pre_migration_005

# Run migration
docker compose exec backend python -m alembic upgrade head

# If migration fails, restore from backup
cp data/tasks.db.backup_pre_migration_005 data/tasks.db
```

### Rollback Options

| Approach | Feasibility | Recommendation |
|----------|-------------|----------------|
| **Automated Alembic downgrade()** | Possible but complex (must recreate single-table from three tables) | ❌ NOT IMPLEMENTED - Too complex, risky |
| **Restore from backup** | Simple, reliable | ✅ **RECOMMENDED** - Safest rollback method |
| **Manual SQL repair** | Error-prone | ❌ Only as last resort |

### Decision

**Rollback via database backup restore (no automated downgrade)**

**Rationale**:
- Automated downgrade would require complex logic to merge three tables back into one
- Risk of data loss or corruption during downgrade
- Simpler and safer to restore from backup taken immediately before migration
- Aligns with spec "Out of Scope" item: "Migration from three-table schema back to single-table schema (rollback support is limited to restoring from backup, not automated downgrade)"

**Downgrade Implementation**:
```python
def downgrade():
    """Downgrade is not supported for this major schema change."""
    raise NotImplementedError(
        "Cannot downgrade from three-table schema. "
        "Restore from database backup taken before migration instead."
    )
```

**Recovery Procedure** (documented in migration script comments):
1. Stop application
2. Restore database from backup: `cp data/tasks.db.backup_pre_migration_005 data/tasks.db`
3. Verify backup integrity: `sqlite3 data/tasks.db "SELECT COUNT(*) FROM tasks;"`
4. Restart application on backup database
5. Investigate migration failure, fix root cause, retry migration

---

## Decision 6: Idempotency & Duplicate Migration Prevention

### Research Question
What should happen if the migration is run multiple times (accidentally or intentionally)?

### Requirements
- Migration should not corrupt data if run twice
- Should provide clear error message if already applied

### Options Considered

| Approach | Behavior | Verdict |
|----------|----------|---------|
| **Alembic version tracking** | Alembic tracks applied migrations in `alembic_version` table | ✅ **PRIMARY** - Built-in idempotency |
| **Table existence check** | Check if `workbench` table exists before creating | ✅ **SECONDARY** - Extra safety |
| **Silent skip** | Do nothing if already applied | ❌ Hides potential configuration issues |

### Decision

**Use Alembic version tracking + explicit table existence check**

**Rationale**:
- Alembic automatically prevents duplicate migrations via `alembic_version` table
- Additional table existence check provides fail-fast with clear error message
- Helps debugging if migration state is corrupted

**Implementation**:
```python
def upgrade():
    # Alembic automatically checks alembic_version table before running

    # Additional safety check
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'workbench' in existing_tables or 'todos' in existing_tables:
        raise RuntimeError(
            "Migration 005 already applied: workbench or todos table already exists. "
            "Check alembic_version table or restore from backup if migration is corrupted."
        )

    # Proceed with migration...
```

---

## Decision 7: Pre-Migration Validation Strategy

### Research Question
What data integrity checks should run before migration to catch issues early?

### Validation Checks

**1. Enum Value Validation**:
```python
def validate_enum_values():
    conn = op.get_bind()

    # Check enrichment_status has valid values
    invalid_enrichment = conn.execute(
        "SELECT COUNT(*) FROM tasks "
        "WHERE enrichment_status IS NOT NULL "
        "AND enrichment_status NOT IN ('pending', 'processing', 'completed', 'failed')"
    ).scalar()

    if invalid_enrichment > 0:
        raise ValueError(f"Found {invalid_enrichment} tasks with invalid enrichment_status")

    # Check status has valid values
    invalid_status = conn.execute(
        "SELECT COUNT(*) FROM tasks "
        "WHERE status IS NOT NULL "
        "AND status NOT IN ('open', 'completed', 'archived')"
    ).scalar()

    if invalid_status > 0:
        raise ValueError(f"Found {invalid_status} tasks with invalid status")
```

**2. Foreign Key Integrity Pre-Check**:
```python
def validate_foreign_keys():
    # Ensure all tasks have valid UUIDs (not null, not empty)
    conn = op.get_bind()

    invalid_ids = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE id IS NULL OR id = ''"
    ).scalar()

    if invalid_ids > 0:
        raise ValueError(f"Found {invalid_ids} tasks with invalid IDs")
```

**3. Record Count Baseline**:
```python
def capture_baseline_counts():
    conn = op.get_bind()

    total_tasks = conn.execute("SELECT COUNT(*) FROM tasks").scalar()
    tasks_with_enrichment = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE enrichment_status IS NOT NULL"
    ).scalar()
    tasks_with_status = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE status IS NOT NULL"
    ).scalar()

    print(f"Baseline counts:")
    print(f"  Total tasks: {total_tasks}")
    print(f"  Tasks with enrichment_status: {tasks_with_enrichment}")
    print(f"  Tasks with status: {tasks_with_status}")

    # Store for post-migration validation
    return total_tasks, tasks_with_enrichment, tasks_with_status
```

### Decision

**Run comprehensive validation before any schema changes**

**Validation Order**:
1. Check for duplicate migration (table existence)
2. Validate enum values (enrichment_status, status)
3. Validate primary keys (no NULL/empty IDs)
4. Capture baseline record counts
5. **ONLY THEN** proceed with schema changes

**Implementation**:
```python
def upgrade():
    # Step 1: Pre-migration validation
    validate_not_already_applied()
    validate_enum_values()
    validate_foreign_keys()
    baseline_counts = capture_baseline_counts()

    # Step 2: Schema changes
    create_new_tables()
    migrate_data()
    drop_old_columns()

    # Step 3: Post-migration validation
    validate_referential_integrity()
    validate_counts_match(baseline_counts)
```

---

## Decision 8: SQLAlchemy Relationship Patterns (One-to-One with Optional Target)

### Research Question
How should we model optional one-to-one relationships in SQLAlchemy 2.0?

### Requirements
- Task ↔ Workbench: one-to-one (optional - task may not have workbench entry yet)
- Task ↔ Todo: one-to-one (optional - task may never enter todo list)
- Must use SQLAlchemy 2.0 Mapped[] syntax

### Pattern Research

**SQLAlchemy 2.0 One-to-One Pattern**:
```python
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

class Task(Base):
    __tablename__ = "tasks"

    # One-to-one with workbench (optional)
    workbench: Mapped[Optional["Workbench"]] = relationship(
        "Workbench",
        back_populates="task",
        uselist=False,  # ONE-to-one (not one-to-many)
        cascade="all, delete-orphan"  # Cascade deletes
    )

    # One-to-one with todo (optional)
    todo: Mapped[Optional["Todo"]] = relationship(
        "Todo",
        back_populates="task",
        uselist=False,
        cascade="all, delete-orphan"
    )

class Workbench(Base):
    __tablename__ = "workbench"

    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # Enforces one-to-one at DB level
    )

    # Back-reference to task
    task: Mapped["Task"] = relationship("Task", back_populates="workbench")
```

### Decision

**Use `uselist=False` + `unique=True` on foreign key for one-to-one relationships**

**Rationale**:
- `uselist=False` tells SQLAlchemy relationship is one-to-one (not one-to-many)
- `unique=True` on foreign key enforces one-to-one constraint at database level
- `Optional[...]` in type hint indicates relationship may be None
- `cascade="all, delete-orphan"` ensures orphaned children are deleted

**Accessing Relationships**:
```python
# Query task and access workbench
task = session.get(Task, task_id)
if task.workbench:  # May be None
    print(f"Enrichment status: {task.workbench.enrichment_status}")

# Query workbench and access task
workbench = session.get(Workbench, workbench_id)
print(f"Task: {workbench.task.user_input}")  # Always exists (non-optional)
```

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Migration Atomicity** | SQLite transactions | Atomic all-or-nothing, built-in rollback |
| **Foreign Key Cascade** | CASCADE DELETE | Prevent orphans, simplify deletion logic |
| **Position Initialization** | Order by created_at | Preserve chronological order |
| **moved_to_todos_at Logic** | Set when todos entry created | Enable future archival |
| **Rollback Strategy** | Backup restore (no downgrade) | Simpler, safer than automated downgrade |
| **Idempotency** | Alembic + table existence check | Prevent duplicate migrations |
| **Pre-Migration Validation** | Enum + FK + count checks | Catch issues before schema changes |
| **Relationship Pattern** | uselist=False + unique FK | One-to-one with optional target |

## References

- [SQLite Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [SQLAlchemy 2.0 Relationships](https://docs.sqlalchemy.org/en/20/orm/relationship_api.html)
- [Alembic Operations Reference](https://alembic.sqlalchemy.org/en/latest/ops.html)
- [SQLite Transaction Isolation](https://www.sqlite.org/isolation.html)

## Next Steps

1. ✅ Research complete - all technical decisions documented
2. ⏳ Create data-model.md with detailed three-table schema
3. ⏳ Create architecture.md with ERD and migration flow diagrams
4. ⏳ Generate tasks.md with TDD implementation tasks
