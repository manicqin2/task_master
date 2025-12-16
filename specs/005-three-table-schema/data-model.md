# Data Model: Three-Table Schema Architecture

**Feature**: 005-three-table-schema
**Date**: 2025-11-15
**Purpose**: Define the complete three-table database schema for tasks, workbench, and todos

## Overview

This document specifies the three-table database schema that separates task data by lifecycle and responsibility:

1. **tasks**: Immutable task content and metadata (WHAT needs to be done)
2. **workbench**: Enrichment workflow state (WHERE in enrichment pipeline)
3. **todos**: Execution workflow state (WHERE in todo list execution)

---

## Table 1: tasks

**Purpose**: Store immutable task content and metadata. This is the source of truth for what the task is about.

**Lifecycle**: Created once when user submits a task, rarely changes after enrichment completes.

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String(36) | PRIMARY KEY | UUID identifying the task |
| `user_input` | Text | NOT NULL | Original task description from user |
| `enriched_text` | Text | NULL | LLM-enhanced description (Feature 001) |
| `created_at` | DateTime(tz) | NOT NULL | When task was created (UTC) |
| `updated_at` | DateTime(tz) | NOT NULL | Last update timestamp (UTC) |
| **Metadata fields** (Feature 004) | | | |
| `project` | String(100) | NULL | Project or category name |
| `persons` | Text (JSON) | NULL | Array of person names as JSON string |
| `task_type` | String(50) | NULL | meeting, call, email, review, development, research, administrative, other |
| `priority` | String(20) | NULL | low, normal, high, urgent |
| `deadline_text` | String(200) | NULL | Original deadline phrase |
| `deadline_parsed` | DateTime(tz) | NULL | Parsed deadline datetime (UTC) |
| `effort_estimate` | Integer | NULL | Estimated minutes to complete |
| `dependencies` | Text (JSON) | NULL | Array of dependencies as JSON string |
| `tags` | Text (JSON) | NULL | Array of tags as JSON string |
| `extracted_at` | DateTime(tz) | NULL | When metadata extraction occurred |
| `requires_attention` | Boolean | NOT NULL, DEFAULT FALSE | Whether task needs user review |

### Indexes

- PRIMARY KEY on `id`
- INDEX on `project` (for project-based queries)
- INDEX on `deadline_parsed` (for deadline filtering)

### Relationships

- **One-to-one (optional)** with `workbench` via `workbench.task_id`
- **One-to-one (optional)** with `todos` via `todos.task_id`

### Constraints

- `id` must be valid UUID (non-empty string)
- `user_input` must have minimum length 1
- `task_type` if present must be one of the valid enum values (enforced at application level)
- `priority` if present must be one of the valid enum values (enforced at application level)

### SQLAlchemy Model

```python
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    enriched_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Metadata fields (Feature 004)
    project: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    persons: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    task_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    deadline_text: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    deadline_parsed: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    effort_estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dependencies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array as TEXT
    extracted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    requires_attention: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships (NEW in Feature 005)
    workbench: Mapped[Optional["Workbench"]] = relationship(
        "Workbench",
        back_populates="task",
        uselist=False,  # One-to-one
        cascade="all, delete-orphan"
    )
    todo: Mapped[Optional["Todo"]] = relationship(
        "Todo",
        back_populates="task",
        uselist=False,  # One-to-one
        cascade="all, delete-orphan"
    )
```

### Migration Changes

**Columns REMOVED** (migrated to other tables):
- `status` (moved to `todos.status`)
- `enrichment_status` (moved to `workbench.enrichment_status`)
- `error_message` (moved to `workbench.error_message`)

**Columns ADDED**:
- None (relationships are ORM-level only, not database columns)

---

## Table 2: workbench (NEW)

**Purpose**: Store enrichment workflow state for tasks in the Task Workbench (Pending, More Info, Ready lanes).

**Lifecycle**: Created when task is submitted, exists during enrichment, can be archived after task moves to todos.

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String(36) | PRIMARY KEY | UUID identifying the workbench entry |
| `task_id` | String(36) | FOREIGN KEY → tasks.id, UNIQUE, NOT NULL | Reference to task (one-to-one) |
| `enrichment_status` | String(20) | NOT NULL | pending, processing, completed, failed |
| `error_message` | Text | NULL | Error details if enrichment_status=failed |
| `metadata_suggestions` | Text (JSON) | NULL | Full MetadataExtractionResponse as JSON text |
| `moved_to_todos_at` | DateTime(tz) | NULL | When task was moved to todo list (NULL if still in workbench) |
| `created_at` | DateTime(tz) | NOT NULL | When workbench entry was created (UTC) |
| `updated_at` | DateTime(tz) | NOT NULL | Last update timestamp (UTC) |

### Indexes

- PRIMARY KEY on `id`
- UNIQUE INDEX on `task_id` (enforces one-to-one relationship)
- INDEX on `enrichment_status` (for lane filtering)
- INDEX on `moved_to_todos_at` (for archival queries)

### Foreign Keys

- `task_id` → `tasks.id` with CASCADE DELETE
  - When task deleted, workbench entry automatically deleted

### Constraints

- `task_id` must reference existing task in `tasks` table
- `enrichment_status` must be one of: pending, processing, completed, failed (enforced at application level)
- `moved_to_todos_at` should be set ONLY when task moves to todo list

### SQLAlchemy Model

```python
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime

class Workbench(Base):
    __tablename__ = "workbench"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # One-to-one constraint
    )
    enrichment_status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    moved_to_todos_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationship to task
    task: Mapped["Task"] = relationship("Task", back_populates="workbench")
```

### Enum: EnrichmentStatus

```python
from enum import Enum

class EnrichmentStatus(str, Enum):
    """Task enrichment processing status (for workbench table)."""
    PENDING = "pending"         # Queued for enrichment
    PROCESSING = "processing"   # Currently being enriched by LLM
    COMPLETED = "completed"     # Enrichment successful
    FAILED = "failed"          # Enrichment failed (error_message has details)
```

### Lane Derivation Logic

Tasks are displayed in Task Workbench lanes based on workbench table state:

| Lane | Condition |
|------|-----------|
| **Pending** | `enrichment_status IN ('pending', 'processing')` AND `moved_to_todos_at IS NULL` |
| **More Info** | `enrichment_status = 'failed'` OR (`enrichment_status = 'completed'` AND `task.requires_attention = true`) AND `moved_to_todos_at IS NULL` |
| **Ready** | `enrichment_status = 'completed'` AND `task.requires_attention = false` AND `task.project IS NOT NULL` AND `moved_to_todos_at IS NULL` |
| **Not in Workbench** | `moved_to_todos_at IS NOT NULL` (task has graduated to todo list) |

---

## Table 3: todos (NEW)

**Purpose**: Store execution workflow state for tasks in the todo list.

**Lifecycle**: Created when task moves from Ready lane to todo list, long-lived (persists even when archived).

### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String(36) | PRIMARY KEY | UUID identifying the todos entry |
| `task_id` | String(36) | FOREIGN KEY → tasks.id, UNIQUE, NOT NULL | Reference to task (one-to-one) |
| `status` | String(20) | NOT NULL | open, completed, archived |
| `position` | Integer | NULL | Ordering position for drag-drop (1, 2, 3, ...) |
| `created_at` | DateTime(tz) | NOT NULL | When task entered todo list (UTC) |
| `updated_at` | DateTime(tz) | NOT NULL | Last update timestamp (UTC) |

### Indexes

- PRIMARY KEY on `id`
- UNIQUE INDEX on `task_id` (enforces one-to-one relationship)
- INDEX on `status` (for status filtering)
- INDEX on `position` (for ordered queries)

### Foreign Keys

- `task_id` → `tasks.id` with CASCADE DELETE
  - When task deleted, todos entry automatically deleted

### Constraints

- `task_id` must reference existing task in `tasks` table
- `status` must be one of: open, completed, archived (enforced at application level)
- `position` should be unique within same user (future enhancement - currently global ordering)

### SQLAlchemy Model

```python
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime

class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # One-to-one constraint
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationship to task
    task: Mapped["Task"] = relationship("Task", back_populates="todo")
```

### Enum: TodoStatus

```python
from enum import Enum

class TodoStatus(str, Enum):
    """Todo task status (for todos table)."""
    OPEN = "open"              # Active todo, not yet completed
    COMPLETED = "completed"    # Todo marked done
    ARCHIVED = "archived"      # Todo archived (hidden from main view)
```

---

## Relationships Summary

### Entity Relationship Diagram (ERD)

```text
┌─────────────────────────────────────────────────────────────────┐
│                            TASKS                                │
│  (Core immutable data)                                          │
│                                                                 │
│  id (PK)              String(36)                                │
│  user_input           Text                                      │
│  enriched_text        Text?                                     │
│  project              String(100)?                              │
│  persons              Text (JSON)?                              │
│  task_type            String(50)?                               │
│  priority             String(20)?                               │
│  deadline_text        String(200)?                              │
│  deadline_parsed      DateTime?                                 │
│  effort_estimate      Integer?                                  │
│  dependencies         Text (JSON)?                              │
│  tags                 Text (JSON)?                              │
│  extracted_at         DateTime?                                 │
│  requires_attention   Boolean                                   │
│  created_at           DateTime                                  │
│  updated_at           DateTime                                  │
└───────────────────┬─────────────────────────────────────────────┘
                    │
          ┌─────────┴────────────┐
          │                      │
          │ 1:1 (optional)       │ 1:1 (optional)
          ▼                      ▼
┌───────────────────────┐  ┌────────────────────────┐
│     WORKBENCH         │  │        TODOS           │
│  (Enrichment state)   │  │  (Execution state)     │
│                       │  │                        │
│  id (PK)              │  │  id (PK)               │
│  task_id (FK, UNIQUE) │  │  task_id (FK, UNIQUE)  │
│  enrichment_status    │  │  status                │
│  error_message        │  │  position              │
│  metadata_suggestions │  │  created_at            │
│  moved_to_todos_at    │  │  updated_at            │
│  created_at           │  │                        │
│  updated_at           │  │                        │
└───────────────────────┘  └────────────────────────┘

Foreign Keys:
- workbench.task_id → tasks.id (CASCADE DELETE, UNIQUE)
- todos.task_id → tasks.id (CASCADE DELETE, UNIQUE)

Relationships:
- Task.workbench → Workbench (one-to-one, optional)
- Task.todo → Todo (one-to-one, optional)
- Workbench.task → Task (one-to-one, required)
- Todo.task → Task (one-to-one, required)
```

### Relationship Cardinality

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| Task ↔ Workbench | 1:0..1 | Task may have 0 or 1 workbench entry |
| Task ↔ Todo | 1:0..1 | Task may have 0 or 1 todos entry |
| Workbench → Task | 1:1 | Workbench always references exactly 1 task |
| Todo → Task | 1:1 | Todo always references exactly 1 task |

### Cascade Delete Behavior

```text
DELETE FROM tasks WHERE id = ?
  ↓
  ├─→ CASCADE DELETE from workbench WHERE task_id = ?
  └─→ CASCADE DELETE from todos WHERE task_id = ?

Result: Deleting a task automatically deletes its workbench and todos entries (if they exist)
```

---

## Migration Data Flow

### Pre-Migration State (Single Table)

```text
┌─────────────────────────────────────────────────────────┐
│                       TASKS                             │
│                                                         │
│  id, user_input, enriched_text,                         │
│  enrichment_status, error_message, status,              │
│  project, persons, task_type, priority,                 │
│  deadline_text, deadline_parsed, effort_estimate,       │
│  dependencies, tags, extracted_at, requires_attention,  │
│  created_at, updated_at                                 │
└─────────────────────────────────────────────────────────┘
```

### Post-Migration State (Three Tables)

```text
┌──────────────────────────────┐
│          TASKS               │
│  (metadata fields only)      │
│  - enrichment_status REMOVED │
│  - status REMOVED            │
│  - error_message REMOVED     │
└──────────┬───────────────────┘
           │
    ┌──────┴────────┐
    ▼               ▼
┌─────────────┐  ┌──────────────┐
│ WORKBENCH   │  │    TODOS     │
│             │  │              │
│ + enrich.   │  │ + status     │
│   _status   │  │ + position   │
│ + error_    │  │              │
│   message   │  │              │
└─────────────┘  └──────────────┘
```

### Migration Logic Pseudo-Code

```python
def upgrade():
    # Step 1: Create new tables
    op.create_table('workbench', ...)
    op.create_table('todos', ...)

    # Step 2: Migrate to workbench (all tasks with enrichment_status)
    conn.execute("""
        INSERT INTO workbench (id, task_id, enrichment_status, error_message, created_at, updated_at)
        SELECT
            generate_uuid(),
            id,
            enrichment_status,
            error_message,
            created_at,
            datetime('now')
        FROM tasks
        WHERE enrichment_status IS NOT NULL
    """)

    # Step 3: Migrate to todos (all tasks with status)
    # Assign positions based on created_at order
    conn.execute("""
        WITH ordered_tasks AS (
            SELECT id, status, created_at, ROW_NUMBER() OVER (ORDER BY created_at) as position
            FROM tasks
            WHERE status IS NOT NULL
        )
        INSERT INTO todos (id, task_id, status, position, created_at, updated_at)
        SELECT
            generate_uuid(),
            id,
            status,
            position,
            created_at,
            datetime('now')
        FROM ordered_tasks
    """)

    # Step 4: Set moved_to_todos_at for tasks in both tables
    conn.execute("""
        UPDATE workbench
        SET moved_to_todos_at = (SELECT created_at FROM todos WHERE todos.task_id = workbench.task_id)
        WHERE task_id IN (SELECT task_id FROM todos)
    """)

    # Step 5: Drop old columns from tasks
    op.drop_column('tasks', 'enrichment_status')
    op.drop_column('tasks', 'status')
    op.drop_column('tasks', 'error_message')

    # Step 6: Add indexes
    op.create_index('ix_workbench_task_id', 'workbench', ['task_id'])
    op.create_index('ix_workbench_enrichment_status', 'workbench', ['enrichment_status'])
    op.create_index('ix_todos_task_id', 'todos', ['task_id'])
    op.create_index('ix_todos_status', 'todos', ['status'])
```

---

## Query Patterns

### Task Workbench Queries (Join tasks + workbench)

```python
# Get all tasks in Pending lane
pending_tasks = (
    session.query(Task)
    .join(Workbench)
    .filter(Workbench.enrichment_status.in_(['pending', 'processing']))
    .filter(Workbench.moved_to_todos_at == None)
    .all()
)

# Get all tasks in More Info lane
more_info_tasks = (
    session.query(Task)
    .join(Workbench)
    .filter(
        (Workbench.enrichment_status == 'failed') |
        ((Workbench.enrichment_status == 'completed') & (Task.requires_attention == True))
    )
    .filter(Workbench.moved_to_todos_at == None)
    .all()
)

# Get all tasks in Ready lane
ready_tasks = (
    session.query(Task)
    .join(Workbench)
    .filter(Workbench.enrichment_status == 'completed')
    .filter(Task.requires_attention == False)
    .filter(Task.project != None)
    .filter(Workbench.moved_to_todos_at == None)
    .all()
)
```

### Todo List Queries (Join tasks + todos)

```python
# Get all open todos ordered by position
open_todos = (
    session.query(Task)
    .join(Todo)
    .filter(Todo.status == 'open')
    .order_by(Todo.position)
    .all()
)

# Mark todo as completed
todo = session.query(Todo).filter(Todo.task_id == task_id).one()
todo.status = 'completed'
todo.updated_at = datetime.now(timezone.utc)
session.commit()
```

### API Backward Compatibility (Join all three tables)

```python
# GET /api/tasks/{id} - Return task with enrichment_status and status
task = session.query(Task).filter(Task.id == task_id).one()

response = {
    "id": task.id,
    "user_input": task.user_input,
    "enriched_text": task.enriched_text,
    "created_at": task.created_at,
    "updated_at": task.updated_at,

    # Metadata from tasks table
    "project": task.project,
    "persons": json.loads(task.persons) if task.persons else [],
    "task_type": task.task_type,
    "priority": task.priority,
    # ... other metadata ...

    # Enrichment status from workbench table (backward compat)
    "enrichment_status": task.workbench.enrichment_status if task.workbench else None,
    "error_message": task.workbench.error_message if task.workbench else None,

    # Execution status from todos table (backward compat)
    "status": task.todo.status if task.todo else None,
}
```

---

## Validation & Integrity Constraints

### Database-Level Constraints

1. **Foreign Key Integrity**: Enforced by CASCADE DELETE foreign keys
2. **Uniqueness**: `workbench.task_id` and `todos.task_id` are UNIQUE (one-to-one)
3. **NOT NULL**: Required fields enforced at database level
4. **Primary Keys**: Auto-generated UUIDs prevent duplicates

### Application-Level Constraints

1. **Enum Validation**: `enrichment_status`, `status`, `task_type`, `priority` validated against enum values
2. **JSON Validation**: `persons`, `dependencies`, `tags`, `metadata_suggestions` validated as valid JSON
3. **Relationship Validation**: Cannot create workbench/todos without valid task_id

### Migration Validation

**Pre-Migration Checks**:
- Validate all `enrichment_status` values are valid enums
- Validate all `status` values are valid enums
- Validate no NULL primary keys

**Post-Migration Checks**:
- Verify record counts match: `COUNT(tasks) = baseline`
- Verify no orphaned records: `workbench.task_id` all exist in `tasks`
- Verify no orphaned records: `todos.task_id` all exist in `tasks`
- Verify moved_to_todos_at set for tasks in both workbench and todos

---

## Summary

This three-table schema provides:

✅ **Clear separation of concerns**: Immutable data vs. workflow state
✅ **Query efficiency**: Targeted queries against smaller tables
✅ **Data lifecycle clarity**: Each table has distinct purpose and lifecycle
✅ **Referential integrity**: Foreign keys with cascade deletes
✅ **Backward compatibility**: API responses unchanged via joins
✅ **Future flexibility**: Enables archival and multiple execution views

Next steps:
1. ✅ Data model complete
2. ⏳ Create architecture.md with ERD diagrams (Mermaid format)
3. ⏳ Generate tasks.md with TDD implementation tasks
