# Data Model: Task Management UI Enhancements

**Feature**: 008-ui-enhancements
**Date**: 2026-01-06

## Overview

This feature does **not introduce new database tables or schemas**. It enhances existing Task model behavior through:
1. Application-level default for `priority` field
2. Natural language date parsing for `deadline` field (stored as ISO date string)
3. Query filtering logic for tab views (no schema changes)

---

## Existing Task Model (Enhanced)

**Table**: `tasks` (existing from Feature 001)

**Location**: `backend/src/models/task.py`

### Schema (Unchanged)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | Primary Key | Auto-incrementing task ID |
| user_input | String | NOT NULL | Original user task description |
| enriched_text | String | Nullable | LLM-enhanced task description |
| project | String | Nullable | Project assignment (e.g., "Work", "Personal") |
| persons | JSON | Nullable | Array of assigned persons (e.g., ["Alice", "Bob"]) |
| deadline | String | Nullable | **ISO date format (YYYY-MM-DD)** |
| priority | String | Nullable → **Application Default: "Low"** | Priority level (Low, Normal, High, Urgent) |
| task_type | String | Nullable | Task category (Meeting, Call, Email, etc.) |
| effort_estimate | Integer | Nullable | Estimated minutes |
| dependencies | JSON | Nullable | Array of dependency task IDs |
| tags | JSON | Nullable | Array of tags |
| created_at | DateTime | NOT NULL, Default: now() | Creation timestamp |
| updated_at | DateTime | NOT NULL, Default: now() | Last update timestamp |

### Enhanced Behavior

**1. Priority Default (FR-001, FR-002)**

```python
# backend/src/models/task.py
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

class Task(Base):
    __tablename__ = "tasks"

    # Existing fields...
    priority: Mapped[str | None] = mapped_column(
        String,
        default="Low"  # NEW: Application-level default
    )
```

**Rationale**:
- Application-level default (not database DEFAULT constraint) allows flexibility
- Frontend can override default before sending to backend
- Backward compatible: Existing tasks with `priority = null` work without migration
- LLM enrichment can override default if it detects different priority

**2. Deadline Storage (FR-004, FR-011)**

- **Input**: Accepts natural language ("tomorrow", "next Friday") or ISO dates ("2026-01-15")
- **Storage**: Always stored as ISO date string (YYYY-MM-DD)
- **Display**: Shows ISO date (not original phrase - per FR-014)

```python
# Example deadline values in database:
"2026-01-15"   # Absolute date
"2026-01-07"   # Converted from "tomorrow" (entered 2026-01-06)
"2026-01-10"   # Converted from "next Friday" (entered 2026-01-06 Monday)
null           # No deadline set
```

**3. Sorting Behavior (FR-012)**

When querying tasks, apply multi-criteria sorting:

```python
# backend/src/services/task_service.py (pseudo-code)
def get_tasks_sorted(filter: TaskFilter | None = None):
    query = session.query(Task)

    # Apply filters
    if filter and filter.project:
        query = query.filter(Task.project == filter.project)
    if filter and filter.deadline:
        query = query.filter(Task.deadline == filter.deadline)
    if filter and filter.person:
        query = query.filter(Task.persons.contains([filter.person]))

    # Sorting: Primary by priority, secondary by deadline
    # NOTE: SQLAlchemy sorting for null deadlines is database-specific
    # Simpler to sort in frontend (Array.sort) after fetching
    return query.all()
```

**Frontend Sorting** (preferred for clarity):

```typescript
// frontend/src/lib/taskSorting.ts
const PRIORITY_ORDER = { 'Urgent': 0, 'High': 1, 'Normal': 2, 'Low': 3 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary: Priority
    const priorityA = PRIORITY_ORDER[a.priority ?? 'Low'];
    const priorityB = PRIORITY_ORDER[b.priority ?? 'Low'];
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Secondary: Deadline (ascending, nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}
```

---

## Task Filter Type (Frontend)

**New Type**: `TaskFilter` (no database representation)

**Location**: `frontend/src/types/filters.ts`

```typescript
export interface TaskFilter {
  project?: string;       // Filter by project name
  deadline?: string;      // Filter by deadline date (ISO format)
  person?: string;        // Filter by assigned person
}

// Usage examples:
const todosFilter: TaskFilter | undefined = undefined;  // No filter = all tasks
const projectFilter: TaskFilter = { project: "Work" };  // Only "Work" project tasks
const agendaFilter: TaskFilter = { deadline: "2026-01-15" };  // Only tasks due 2026-01-15
const personFilter: TaskFilter = { person: "Alice" };   // Only tasks assigned to Alice
```

**Query String Mapping**:

| Filter | Query String Example | Description |
|--------|---------------------|-------------|
| None | `GET /api/v1/todos` | All tasks (Todos tab) |
| Project | `GET /api/v1/todos?project=Work` | Tasks in "Work" project |
| Deadline | `GET /api/v1/todos?deadline=2026-01-15` | Tasks due on specific date |
| Person | `GET /api/v1/todos?person=Alice` | Tasks assigned to Alice |

---

## Data Validation

### Frontend Validation (Immediate)

**Priority**:
- Enum validation: Must be one of `["Low", "Normal", "High", "Urgent"]`
- Default value: `"Low"` if not specified

**Deadline (Natural Language)**:
```typescript
// frontend/src/lib/dateUtils.ts
import * as chrono from 'chrono-node';

function validateDeadlineInput(input: string): string | null {
  // Try parsing with chrono-node
  const parsed = chrono.parseDate(input);
  if (parsed) {
    return parsed.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Check if already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  return null; // Invalid
}
```

**Error Messages** (FR-006):
- Invalid input: _"Could not parse deadline. Try formats like: 'tomorrow', 'next Friday', 'in 2 weeks', or 'YYYY-MM-DD'"_
- Ambiguous date: _"Did you mean this Friday (2026-01-10) or next Friday (2026-01-17)?"_

### Backend Validation (Final)

```python
# backend/src/lib/date_utils.py
from dateutil.parser import parse as parse_date
from datetime import datetime, timedelta
import re

def parse_natural_language_deadline(text: str) -> str | None:
    """
    Parse natural language date to ISO format (YYYY-MM-DD).

    Returns:
        ISO date string (YYYY-MM-DD) or None if unparseable
    """
    try:
        text = text.strip().lower()

        # Handle common relative dates explicitly
        if text == "tomorrow":
            return (datetime.now() + timedelta(days=1)).date().isoformat()
        elif text == "today":
            return datetime.now().date().isoformat()
        elif text.startswith("in ") and "day" in text:
            match = re.search(r'in (\d+) day', text)
            if match:
                days = int(match.group(1))
                return (datetime.now() + timedelta(days=days)).date().isoformat()
        elif text.startswith("in ") and "week" in text:
            match = re.search(r'in (\d+) week', text)
            if match:
                weeks = int(match.group(1))
                return (datetime.now() + timedelta(weeks=weeks)).date().isoformat()

        # Try dateutil parser for complex cases
        parsed = parse_date(text, fuzzy=True)
        return parsed.date().isoformat()

    except (ValueError, AttributeError):
        return None
```

**Validation Rules**:
1. If input is already ISO format (`YYYY-MM-DD`), pass through unchanged
2. If natural language, parse to ISO date
3. If unparseable, return validation error with helpful examples
4. Always store as ISO date string (no time component)

---

## Edge Cases

### 1. Priority Default with Null Values

**Scenario**: Existing task has `priority = null` in database

**Handling**:
```typescript
// Frontend display
const displayPriority = task.priority ?? 'Low';  // Null coalescing operator

// Form initialization
const { register } = useForm({
  defaultValues: {
    priority: task.priority ?? 'Low'  // Shows "Low" in selector
  }
});
```

**Result**: No database migration needed, handled at application layer

### 2. Deadline Recalculation (FR-011)

**Scenario**: User enters "tomorrow" on Monday (2026-01-06), views task on Tuesday (2026-01-07)

**Handling**:
- Stored: `"2026-01-07"` (Tuesday's date)
- Displayed on Tuesday: Still shows `"2026-01-07"` (no recalculation)
- **Never recalculates** - stored value is permanent

### 3. Same Priority Sorting with Null Deadlines (FR-012)

**Scenario**: 3 tasks all with priority="Low", 1 has deadline, 2 have `null`

**Handling**:
```typescript
const tasks = [
  { id: 1, priority: 'Low', deadline: null },
  { id: 2, priority: 'Low', deadline: '2026-01-15' },
  { id: 3, priority: 'Low', deadline: null },
];

// After sorting:
[
  { id: 2, priority: 'Low', deadline: '2026-01-15' },  // Deadline first
  { id: 1, priority: 'Low', deadline: null },          // Nulls last
  { id: 3, priority: 'Low', deadline: null },
]
```

### 4. "Next Monday" on a Monday (FR-013)

**Scenario**: Today is Monday (2026-01-06), user enters "next Monday"

**Handling**:
- Interpretation: **7 days from now** → `"2026-01-13"` (following Monday)
- **Not today** (current Monday)

**Implementation**:
```python
if text.startswith("next ") and "monday" in text:
    # Always interpret "next" as +7 days, even if today matches
    target_weekday = 0  # Monday = 0
    days_ahead = 7
    return (datetime.now() + timedelta(days=days_ahead)).date().isoformat()
```

---

## Migration Strategy

**No database migration required** ✅

**Backward Compatibility**:
- Existing tasks with `priority = null` display as "Low" (frontend default)
- Existing tasks with deadline continue working unchanged
- No breaking changes to Task model schema

**Deployment Steps**:
1. Deploy backend with priority default in model
2. Deploy frontend with new components and date parsing
3. Existing data works without modification
4. New tasks automatically get priority="Low" unless overridden

---

## Summary

**Modified Entities**: 1 (Task model - application-level default added)

**New Entities**: 1 (TaskFilter type - frontend only, no database representation)

**Schema Changes**: None (all enhancements are application-level)

**Backward Compatibility**: 100% (no breaking changes, defaults handle null values)
