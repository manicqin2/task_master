# API Contract Examples: Task Management UI Enhancements

**Feature**: 008-ui-enhancements
**Date**: 2026-01-06

## Overview

This feature **reuses existing API endpoints** with enhanced behavior:
- Priority defaults to "Low" if not specified
- Deadline accepts natural language input and returns ISO dates
- Query parameters support filtering for tab views

**No new endpoints required** - all functionality uses existing `/api/v1/tasks` and `/api/v1/todos` routes.

---

## Endpoint 1: Get Todos (Filtered)

### Base Endpoint (Todos Tab - No Filter)

**Request**:
```http
GET /api/v1/todos HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "user_input": "Review pull request",
    "enriched_text": "Review and merge pull request #42",
    "project": "Work",
    "persons": ["Alice"],
    "deadline": "2026-01-10",
    "priority": "Normal",
    "task_type": "Review",
    "status": "open",
    "created_at": "2026-01-06T10:30:00Z"
  },
  {
    "id": 2,
    "user_input": "Buy groceries",
    "enriched_text": "Buy groceries for the week",
    "project": "Personal",
    "persons": null,
    "deadline": null,
    "priority": "Low",  // DEFAULT VALUE (FR-001)
    "task_type": null,
    "status": "open",
    "created_at": "2026-01-06T11:15:00Z"
  }
]
```

---

### Filtered by Project (Projects Tab)

**Request**:
```http
GET /api/v1/todos?project=Work HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "user_input": "Review pull request",
    "project": "Work",
    "priority": "Normal",
    "deadline": "2026-01-10"
    // ... other fields
  },
  {
    "id": 3,
    "user_input": "Prepare presentation",
    "project": "Work",
    "priority": "High",
    "deadline": "2026-01-08"
    // ... other fields
  }
]
```

**Note**: Only tasks with `project = "Work"` are returned

---

### Filtered by Deadline (Agenda Tab)

**Request**:
```http
GET /api/v1/todos?deadline=2026-01-10 HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "user_input": "Review pull request",
    "deadline": "2026-01-10",
    "priority": "Normal",
    "project": "Work"
    // ... other fields
  },
  {
    "id": 5,
    "user_input": "Doctor appointment",
    "deadline": "2026-01-10",
    "priority": "High",
    "project": "Personal"
    // ... other fields
  }
]
```

**Note**: Only tasks with `deadline = "2026-01-10"` are returned

---

### Filtered by Person (Persons Tab)

**Request**:
```http
GET /api/v1/todos?person=Alice HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "user_input": "Review pull request",
    "persons": ["Alice"],
    "priority": "Normal",
    "project": "Work"
    // ... other fields
  },
  {
    "id": 7,
    "user_input": "Coffee meeting",
    "persons": ["Alice", "Bob"],
    "priority": "Low",
    "project": "Personal"
    // ... other fields
  }
]
```

**Note**: Returns tasks where `persons` array contains "Alice"

---

## Endpoint 2: Create Task (with Priority Default)

### Create Task Without Priority

**Request**:
```http
POST /api/v1/tasks HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "user_input": "Write blog post about TypeScript"
}
```

**Response** (201 Created):
```json
{
  "id": 10,
  "user_input": "Write blog post about TypeScript",
  "enriched_text": null,  // Will be populated by enrichment service
  "project": null,
  "persons": null,
  "deadline": null,
  "priority": "Low",  // DEFAULT VALUE APPLIED (FR-001)
  "task_type": null,
  "status": "open",
  "created_at": "2026-01-06T14:22:00Z"
}
```

**Behavior**:
- Priority defaults to "Low" at backend model level
- Frontend also sets `priority: "Low"` in form (dual default for UX)
- LLM enrichment may update priority if detected in user input

---

### Create Task With Explicit Priority

**Request**:
```http
POST /api/v1/tasks HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "user_input": "URGENT: Fix production bug",
  "priority": "Urgent"
}
```

**Response** (201 Created):
```json
{
  "id": 11,
  "user_input": "URGENT: Fix production bug",
  "priority": "Urgent",  // User-specified priority preserved
  // ... other fields
}
```

**Behavior**: User-specified priority overrides default

---

## Endpoint 3: Update Task Metadata (with Natural Language Deadline)

### Update Deadline with Natural Language

**Request**:
```http
PATCH /api/v1/tasks/10/metadata HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "deadline": "tomorrow",
  "project": "Personal"
}
```

**Response** (200 OK):
```json
{
  "id": 10,
  "user_input": "Write blog post about TypeScript",
  "project": "Personal",
  "deadline": "2026-01-07",  // CONVERTED FROM "tomorrow" (FR-004)
  "priority": "Low",
  // ... other fields
}
```

**Backend Processing** (FR-004, FR-011):
1. Receives `"deadline": "tomorrow"`
2. Backend calls `parse_natural_language_deadline("tomorrow")`
3. Returns ISO date `"2026-01-07"` (assuming today is 2026-01-06)
4. Stores `"2026-01-07"` in database (permanent, no recalculation)
5. Future views show `"2026-01-07"`, not "tomorrow" (FR-014)

---

### Update Deadline with "next Monday" on Monday (Edge Case - FR-013)

**Scenario**: Today is Monday, 2026-01-06

**Request**:
```http
PATCH /api/v1/tasks/11/metadata HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "deadline": "next Monday"
}
```

**Response** (200 OK):
```json
{
  "id": 11,
  "deadline": "2026-01-13"  // 7 DAYS FROM NOW, not today (FR-013)
}
```

**Interpretation**:
- "next Monday" = 7 days from current date
- NOT today (even though today is Monday)
- Result: 2026-01-13 (following Monday)

---

### Update Deadline with Invalid Input (Validation Error - FR-006)

**Request**:
```http
PATCH /api/v1/tasks/12/metadata HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "deadline": "someday"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "InvalidDeadlineFormat",
  "message": "Could not parse deadline 'someday'",
  "suggestions": [
    "Try natural language: 'tomorrow', 'next Friday', 'in 2 weeks'",
    "Or use ISO format: 'YYYY-MM-DD' (e.g., '2026-01-15')"
  ]
}
```

**Validation** (FR-006):
- Backend attempts to parse with python-dateutil
- If parsing fails, returns 400 with helpful error message
- Frontend shows error inline in deadline input field

---

## Endpoint 4: Get Tasks (with Sorting)

### Get Tasks Sorted by Priority and Deadline (FR-012)

**Request**:
```http
GET /api/v1/todos HTTP/1.1
Host: localhost:8000
Accept: application/json
```

**Response** (200 OK - Sorted):
```json
[
  {
    "id": 11,
    "user_input": "URGENT: Fix production bug",
    "priority": "Urgent",
    "deadline": "2026-01-06"  // Urgent priority, earliest deadline
  },
  {
    "id": 5,
    "user_input": "Doctor appointment",
    "priority": "High",
    "deadline": "2026-01-10"  // High priority, early deadline
  },
  {
    "id": 1,
    "user_input": "Review pull request",
    "priority": "Normal",
    "deadline": "2026-01-10"  // Normal priority
  },
  {
    "id": 10,
    "user_input": "Write blog post",
    "priority": "Low",
    "deadline": "2026-01-07"  // Low priority, has deadline
  },
  {
    "id": 2,
    "user_input": "Buy groceries",
    "priority": "Low",
    "deadline": null  // Low priority, NO deadline (goes last - FR-012)
  }
]
```

**Sorting Rules** (FR-012):
1. **Primary**: Priority (Urgent > High > Normal > Low)
2. **Secondary** (within same priority): Deadline ascending (earliest first)
3. **Nulls Last**: Tasks without deadlines appear after tasks with deadlines in same priority group

**Implementation Note**: Sorting is typically done in frontend (`Array.sort()`) for simplicity, as SQL sorting with nulls handling is database-specific.

---

## Frontend Integration Examples

### React Query Hook with Filtering

```typescript
// frontend/src/hooks/useFilteredTasks.ts
import { useQuery } from '@tanstack/react-query';

interface TaskFilter {
  project?: string;
  deadline?: string;
  person?: string;
}

export function useFilteredTasks(filter?: TaskFilter) {
  return useQuery({
    queryKey: ['todos', filter],  // Cache key includes filter for isolation
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter?.project) params.set('project', filter.project);
      if (filter?.deadline) params.set('deadline', filter.deadline);
      if (filter?.person) params.set('person', filter.person);

      const url = `/api/v1/todos?${params.toString()}`;
      return fetch(url).then(res => res.json());
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}

// Usage in tabs:
const { data: workTasks } = useFilteredTasks({ project: 'Work' });
const { data: todayTasks } = useFilteredTasks({ deadline: '2026-01-06' });
const { data: aliceTasks } = useFilteredTasks({ person: 'Alice' });
```

---

### Natural Language Deadline Input Component

```typescript
// frontend/src/components/TaskWorkbench/DeadlineInput.tsx
import { useState } from 'react';
import * as chrono from 'chrono-node';

function DeadlineInput({ value, onChange }: { value?: string; onChange: (iso: string) => void }) {
  const [input, setInput] = useState(value || '');
  const [preview, setPreview] = useState<string | null>(null);

  const handleInputChange = (text: string) => {
    setInput(text);

    // Try parsing with chrono-node for instant preview
    const parsed = chrono.parseDate(text);
    if (parsed) {
      const iso = parsed.toISOString().split('T')[0];
      setPreview(iso);
    } else {
      setPreview(null);
    }
  };

  const handleSave = () => {
    if (preview) {
      onChange(preview);  // Send ISO date to backend
    }
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="tomorrow, next Friday, or YYYY-MM-DD"
      />
      {preview && <span className="preview">Preview: {preview}</span>}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

---

## Summary

**Reused Endpoints**: 2 (`GET /api/v1/todos`, `PATCH /api/v1/tasks/{id}/metadata`)

**New Query Parameters**:
- `?project=<string>` - Filter by project
- `?deadline=<YYYY-MM-DD>` - Filter by deadline date
- `?person=<string>` - Filter by assigned person

**Enhanced Behaviors**:
- Priority defaults to "Low" if not specified (FR-001)
- Deadline accepts natural language input, returns ISO dates (FR-004)
- Sorting by priority + deadline (frontend-implemented - FR-012)
- Validation errors provide helpful suggestions (FR-006)

**Backward Compatibility**: 100% - all changes are additive (query params optional, defaults don't break existing code)
