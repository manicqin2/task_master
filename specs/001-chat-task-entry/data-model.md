# Data Model: Chat-Based Task Entry

**Feature**: Chat-Based Task Entry
**Date**: 2025-11-04
**Status**: Complete

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for the chat-based task entry feature. The model supports async task enrichment with real-time status tracking.

## Entity Definitions

### Task

Represents a single to-do item created from user chat input, enriched by LLM.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (string) | Primary key, auto-generated | Unique task identifier |
| `user_input` | Text | NOT NULL, max 1000 chars | Original user message from chat |
| `enriched_text` | Text | NULLABLE, max 2000 chars | LLM-improved version (null during enrichment) |
| `status` | Enum | NOT NULL, default "open" | Task completion status (always "open" for this feature) |
| `enrichment_status` | Enum | NOT NULL, default "pending" | Enrichment processing state |
| `created_at` | DateTime | NOT NULL, auto-set | Timestamp of task creation (UTC) |
| `updated_at` | DateTime | NOT NULL, auto-update | Timestamp of last modification (UTC) |
| `error_message` | Text | NULLABLE, max 500 chars | Error details if enrichment fails |

**Enums**:
- `status`: `"open"` (only value for this feature; future: `"completed"`, `"archived"`)
- `enrichment_status`: `"pending"`, `"processing"`, `"completed"`, `"failed"`

**Validation Rules**:
- `user_input` MUST NOT be empty string (trimmed)
- `user_input` length MUST be 1-1000 characters after trimming
- `enriched_text` MUST be populated when `enrichment_status` = `"completed"`
- `error_message` MUST be populated when `enrichment_status` = `"failed"`
- `created_at` MUST be <= `updated_at`

**Indexes**:
- Primary key on `id`
- Index on `created_at DESC` (for reverse chronological ordering per FR-007)
- Index on `enrichment_status` (for filtering pending/processing tasks)

**SQLAlchemy Model**:
```python
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
import uuid
import enum

Base = declarative_base()

class TaskStatus(enum.Enum):
    OPEN = "open"
    # Future: COMPLETED = "completed", ARCHIVED = "archived"

class EnrichmentStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_input = Column(Text, nullable=False)
    enriched_text = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus), nullable=False, default=TaskStatus.OPEN)
    enrichment_status = Column(SQLEnum(EnrichmentStatus), nullable=False, default=EnrichmentStatus.PENDING)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    error_message = Column(Text, nullable=True)
```

---

### Message

Represents a chat message in the UI (ephemeral, not persisted per spec assumptions).

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (string) | Client-generated | Unique message identifier |
| `content` | Text | NOT NULL, max 1000 chars | Message text content |
| `timestamp` | DateTime | NOT NULL | Message creation time (client-side) |
| `type` | Enum | NOT NULL | Message type classification |
| `task_id` | UUID (string) | NULLABLE | Associated task ID (if type = "task_created") |

**Enums**:
- `type`: `"user_message"`, `"system_confirmation"`, `"error"`

**Validation Rules**:
- `content` MUST NOT be empty string
- `task_id` MUST be populated when `type` = `"system_confirmation"`
- `timestamp` MUST be in the past or present

**Storage**:
- **Frontend-only** (in-memory React state, per spec assumption: "Chat history is ephemeral")
- Not persisted to backend database
- Cleared on page refresh

**TypeScript Interface**:
```typescript
export enum MessageType {
  USER_MESSAGE = "user_message",
  SYSTEM_CONFIRMATION = "system_confirmation",
  ERROR = "error"
}

export interface Message {
  id: string;  // UUID
  content: string;
  timestamp: Date;
  type: MessageType;
  taskId?: string;  // Optional, present when type = SYSTEM_CONFIRMATION
}
```

---

## Relationships

### Task ↔ Message
- **Relationship**: One Task can be referenced by one Message (1:1, loose coupling)
- **Implementation**: `Message.task_id` stores the associated `Task.id` (frontend-only)
- **Constraints**:
  - Message can exist without a Task (e.g., error messages)
  - Task always exists independently of Messages (persistent vs ephemeral)

**ER Diagram**:
```
┌─────────────────────┐
│       Task          │
│ (Persistent - DB)   │
├─────────────────────┤
│ id (PK)             │
│ user_input          │
│ enriched_text       │
│ status              │
│ enrichment_status   │
│ created_at          │
│ updated_at          │
│ error_message       │
└─────────────────────┘
         △
         │ (referenced by)
         │
┌─────────────────────┐
│      Message        │
│ (Ephemeral - UI)    │
├─────────────────────┤
│ id (PK)             │
│ content             │
│ timestamp           │
│ type                │
│ task_id (FK)        │ ─────┘
└─────────────────────┘
```

---

## State Transitions

### Task Enrichment Lifecycle

```
                  ┌─────────┐
                  │ PENDING │  (Initial state after task creation)
                  └────┬────┘
                       │
                       │ Background task picks up task
                       ▼
                ┌────────────┐
                │ PROCESSING │  (LLM enrichment in progress)
                └──┬────────┬┘
                   │        │
     LLM success   │        │   LLM failure
                   │        │
                   ▼        ▼
            ┌───────────┐  ┌────────┐
            │ COMPLETED │  │ FAILED │
            └───────────┘  └────────┘
                 (final states)
```

**State Transition Rules**:

1. **PENDING → PROCESSING**
   - **Trigger**: Background task starts enrichment
   - **Precondition**: `enrichment_status` = `"pending"`
   - **Action**: Set `enrichment_status` = `"processing"`
   - **Validation**: None (automatic)

2. **PROCESSING → COMPLETED**
   - **Trigger**: LLM returns enriched text successfully
   - **Precondition**: `enrichment_status` = `"processing"` AND Ollama API returns 200
   - **Action**:
     - Set `enrichment_status` = `"completed"`
     - Populate `enriched_text` with LLM response
     - Update `updated_at` timestamp
     - Send WebSocket notification to frontend
   - **Validation**: `enriched_text` MUST NOT be empty

3. **PROCESSING → FAILED**
   - **Trigger**: LLM enrichment throws exception
   - **Precondition**: `enrichment_status` = `"processing"` AND (Ollama timeout, API error, or network failure)
   - **Action**:
     - Set `enrichment_status` = `"failed"`
     - Populate `error_message` with exception details
     - Update `updated_at` timestamp
     - Send WebSocket notification to frontend
   - **Validation**: `error_message` MUST NOT be empty

**Invariants**:
- Tasks NEVER transition back from `COMPLETED` or `FAILED` (terminal states for this feature)
- `enriched_text` is NULL while `enrichment_status` ∈ {`PENDING`, `PROCESSING`, `FAILED`}
- `error_message` is NULL unless `enrichment_status` = `FAILED`

---

## Data Access Patterns

### Read Operations

**1. List All Open Tasks (Reverse Chronological)**
- **Use Case**: Display task list in UI (FR-007)
- **Query**: `SELECT * FROM tasks WHERE status = 'open' ORDER BY created_at DESC`
- **Index**: Uses `created_at DESC` index
- **Expected Volume**: ~100s of tasks (per spec scale)

**2. Get Task by ID**
- **Use Case**: Fetch task details after enrichment completion
- **Query**: `SELECT * FROM tasks WHERE id = ?`
- **Index**: Primary key lookup
- **Expected Volume**: Individual lookups, <10/sec

**3. Get Pending/Processing Tasks**
- **Use Case**: Monitor enrichment queue status
- **Query**: `SELECT * FROM tasks WHERE enrichment_status IN ('pending', 'processing')`
- **Index**: Uses `enrichment_status` index
- **Expected Volume**: Max 5-10 concurrent enrichments (per SC-008)

### Write Operations

**1. Create Task**
- **Use Case**: User submits chat message (FR-001)
- **Operation**: `INSERT INTO tasks (user_input, ...) VALUES (?)`
- **Frequency**: Bursts of 5+ tasks in <10s (SC-008)
- **Validation**: Check `user_input` length 1-1000 chars

**2. Update Enrichment Status**
- **Use Case**: Background task updates processing state
- **Operation**: `UPDATE tasks SET enrichment_status = ?, updated_at = ? WHERE id = ?`
- **Frequency**: 2-3 updates per task (pending→processing→completed)
- **Transaction**: ACID required to prevent race conditions

**3. Update Enriched Text**
- **Use Case**: LLM enrichment completes (FR-004)
- **Operation**: `UPDATE tasks SET enriched_text = ?, enrichment_status = 'completed', updated_at = ? WHERE id = ?`
- **Frequency**: Once per task after ~3s enrichment (SC-005)
- **Validation**: `enriched_text` NOT NULL, length > 0

---

## Database Migrations

### Initial Schema (Migration v1)

```sql
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    user_input TEXT NOT NULL,
    enriched_text TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    enrichment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    CHECK (length(trim(user_input)) BETWEEN 1 AND 1000),
    CHECK (status IN ('open')),
    CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_tasks_created_at DESC ON tasks(created_at DESC);
CREATE INDEX idx_tasks_enrichment_status ON tasks(enrichment_status);
```

**Migration Tool**: Alembic (SQLAlchemy standard)

---

## Data Validation Summary

| Entity | Field | Validation Rules |
|--------|-------|------------------|
| Task | `user_input` | NOT NULL, trimmed length 1-1000 chars |
| Task | `enriched_text` | NULL OR length > 0; NOT NULL when enrichment_status = 'completed' |
| Task | `enrichment_status` | ENUM: pending, processing, completed, failed |
| Task | `error_message` | NULL OR length > 0; NOT NULL when enrichment_status = 'failed' |
| Task | `created_at` | NOT NULL, <= `updated_at` |
| Message | `content` | NOT NULL, length 1-1000 chars |
| Message | `task_id` | NOT NULL when type = 'system_confirmation' |

---

## Performance Considerations

### Database Size Estimates
- **Average Task Size**: ~200 bytes (user_input: 50 chars, enriched_text: 100 chars)
- **100 tasks**: ~20 KB
- **10,000 tasks**: ~2 MB
- **Conclusion**: SQLite handles this scale trivially; no partitioning needed

### Query Performance
- **List tasks**: O(n log n) with index, ~1ms for 100s of tasks
- **Get by ID**: O(1) primary key lookup, <0.1ms
- **Concurrent writes**: SQLite handles via WAL mode, sufficient for single-user

### WebSocket Efficiency
- **Update frequency**: 5 tasks * 3s = 1 update every ~0.6s during bursts
- **Payload size**: ~300 bytes JSON per update
- **Network impact**: Negligible for local deployment

---

## Future Enhancements (Out of Scope)

### Multi-User Support
- Add `user_id` foreign key to `tasks` table
- Add `users` table with authentication
- Update indexes to include `user_id`

### Task Metadata
- Add fields: `due_date`, `assigned_to`, `project_id`, `tags`
- Extend enrichment to extract metadata from user input

### Task Editing/Deletion
- Add `deleted_at` timestamp (soft delete)
- Add audit log for edit history

### Advanced Enrichment
- Add `enrichment_version` field to track LLM model changes
- Add `confidence_score` field for enrichment quality

---

## Conclusion

The data model supports all functional requirements (FR-001 to FR-022) with:
- ✅ Persistent task storage (FR-011)
- ✅ Async enrichment state tracking (FR-013 to FR-019)
- ✅ Reverse chronological ordering (FR-007)
- ✅ Ephemeral chat history (spec assumption)
- ✅ Performance targets (SC-001 to SC-010)

Next steps: Generate API contracts from functional requirements.
