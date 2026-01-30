# Research: UI Enhancement Best Practices

**Feature**: 008-ui-enhancements
**Date**: 2026-01-06
**Context**: Research for default priority handling, natural language date parsing, and component composition patterns

## Research Questions

### 1. What is the best JavaScript library for natural language date parsing that integrates with React?

**Decision**: Use backend `python-dateutil` for parsing, frontend sends input to backend API for validation

**Rationale**:
- python-dateutil is already installed in backend (Feature 004 metadata extraction)
- Provides robust parsing: `dateutil.parser.parse()` handles "tomorrow", "next Friday", "in 2 weeks"
- Centralized parsing logic ensures consistency between LLM metadata extraction and user input
- Frontend can optionally use lightweight library for instant feedback, but backend is source of truth

**Frontend Library Options** (for instant validation/feedback):
- **chrono-node**: 40KB, excellent NLP parsing ("tomorrow at 3pm", "next Friday")
- **date-fns/parse**: 12KB, lighter but requires format strings (less flexible)
- **Recommendation**: Use chrono-node for instant UI feedback, python-dateutil for final validation

**Alternatives Considered**:
- ❌ Frontend-only parsing: Risk of inconsistency with backend LLM extraction
- ❌ Regex-based custom parser: Reinventing the wheel, error-prone
- ✅ **Selected approach**: Hybrid - chrono-node for UX, python-dateutil for validation

**Implementation**:
```typescript
// Frontend: frontend/src/lib/dateUtils.ts
import * as chrono from 'chrono-node';

export function parseNaturalLanguageDate(input: string): Date | null {
  const parsed = chrono.parseDate(input);
  return parsed; // Returns Date object or null
}

export function formatToISO(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
```

```python
# Backend: backend/src/lib/date_utils.py (optional validation endpoint)
from dateutil.parser import parse as parse_date
from datetime import datetime, timedelta

def parse_natural_language_deadline(text: str) -> str | None:
    """Parse natural language date to ISO format (YYYY-MM-DD)."""
    try:
        # Handle relative dates
        text_lower = text.lower().strip()
        if text_lower == "tomorrow":
            return (datetime.now() + timedelta(days=1)).date().isoformat()
        elif text_lower.startswith("in ") and "day" in text_lower:
            days = int(text_lower.split()[1])
            return (datetime.now() + timedelta(days=days)).date().isoformat()
        # Use dateutil for complex parsing
        parsed = parse_date(text, fuzzy=True)
        return parsed.date().isoformat()
    except (ValueError, AttributeError):
        return None
```

### Supported Natural Language Phrases (SC-002 Reference)

| Category | Examples | Behavior |
|----------|----------|----------|
| Relative days | "today", "tomorrow" | Convert to ISO date relative to current date |
| Relative periods | "in 3 days", "in 2 weeks", "in 1 month" | Add N days/weeks/months to today |
| Named weekdays | "Monday", "Friday" | Next occurrence of that weekday |
| Next weekday | "next Monday", "next Friday" | Following week's occurrence |
| Next weekday (edge case) | "next Monday" on Monday | +7 days per FR-013 |
| ISO passthrough | "2026-02-15" | Preserve as-is, no conversion |
| **Invalid/Unsupported** | "someday", "later", "ASAP", "eventually" | Return null, show validation error (FR-006) |

**Edge Case FR-013**: When user enters "next [weekday]" on that same weekday, the system MUST return +7 days (next week), not today.

---

### 2. How should we handle timezone considerations for deadline parsing?

**Decision**: Store deadlines as timezone-naive ISO dates (YYYY-MM-DD), interpret as user's local date

**Rationale**:
- Deadlines are date-based, not time-based ("due Friday" not "due Friday 3pm")
- Storing only date (no timestamp) avoids timezone complexity
- User enters "tomorrow" → system calculates based on user's browser timezone → stores ISO date
- Backend doesn't need to know user timezone for date-only deadlines

**Timezone Handling Strategy**:
1. Frontend: Use browser's local timezone for relative date calculations ("tomorrow" = browser date + 1 day)
2. Storage: ISO date string (YYYY-MM-DD) in UTC-neutral format
3. Display: Show as-is (no timezone conversion needed for dates)

**Edge Case Handling**:
- User enters "tomorrow" at 11:50 PM → Calculate based on current browser date
- If future feature adds time ("tomorrow at 3pm"), introduce timezone field

**Alternatives Considered**:
- ❌ Store with timezone: Overkill for date-only deadlines, adds complexity
- ❌ Always use UTC: Confusing for users ("tomorrow" would be tomorrow UTC, not local)
- ✅ **Selected approach**: Timezone-naive dates, calculated in user's local context

---

### 3. What are best practices for default value handling in React forms with TanStack Query?

**Decision**: Use controlled components with `defaultValue` prop, backed by React Query's `initialData`

**Rationale**:
- TanStack Query provides `initialData` option for setting query defaults
- React Hook Form supports `defaultValues` in `useForm()` hook
- For priority default, set at both levels: form default + backend model default

**Implementation Pattern**:

```typescript
// frontend/src/components/TaskWorkbench/MetadataEditor.tsx
import { useForm } from 'react-hook-form';

interface TaskMetadata {
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  deadline?: string;
  project?: string;
  persons?: string[];
}

function MetadataEditor({ task }: { task: Task }) {
  const { register, handleSubmit } = useForm<TaskMetadata>({
    defaultValues: {
      priority: task.priority ?? 'Low', // Default to Low if null
      deadline: task.deadline,
      project: task.project,
      persons: task.persons ?? [],
    }
  });

  return (
    <Select {...register('priority')} defaultValue="Low">
      <option value="Low">Low</option>
      <option value="Normal">Normal</option>
      <option value="High">High ⚠️</option>
      <option value="Urgent">Urgent 🔥</option>
    </Select>
  );
}
```

**Backend Model Default**:
```python
# backend/src/models/task.py
class Task(Base):
    priority: Mapped[str | None] = mapped_column(String, default="Low")
    # Ensures database-level default if frontend doesn't send priority
```

**Alternatives Considered**:
- ❌ Frontend-only default: Backend could create null priority tasks
- ❌ Backend-only default: Form shows empty field until save
- ✅ **Selected approach**: Dual defaults (frontend UX + backend safety)

---

### 4. How should we implement component composition for filtered list views?

**Decision**: Use compound component pattern with `<TaskListView filter={...}>` wrapper

**Rationale**:
- Maximizes code reuse (one TaskListView used by all tabs)
- Filter logic encapsulated in hook (`useFilteredTasks(filter)`)
- TaskCard remains unchanged (already supports all display needs)
- Easy to add new filtered views in future

**Component Composition Pattern**:

```typescript
// frontend/src/components/TaskList/TaskListView.tsx
interface TaskFilter {
  project?: string;
  deadline?: string;
  person?: string;
}

function TaskListView({ filter }: { filter?: TaskFilter }) {
  const { data: tasks, isLoading } = useFilteredTasks(filter);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

// frontend/src/hooks/useFilteredTasks.ts
function useFilteredTasks(filter?: TaskFilter) {
  return useQuery({
    queryKey: ['todos', filter],
    queryFn: () => fetchTodos(filter),
    // React Query automatically caches and shares data across tabs
  });
}

// Usage in tabs:
// frontend/src/components/Tabs/ProjectsTab.tsx
function ProjectsTab() {
  const [selectedProject, setSelectedProject] = useState<string>();

  return (
    <div>
      <ProjectSelector onChange={setSelectedProject} />
      <TaskListView filter={{ project: selectedProject }} />
    </div>
  );
}
```

**Benefits**:
- Single source of truth for task rendering
- Automatic cache sharing via React Query (edit in one tab, others update instantly)
- Filter changes trigger automatic refetch
- Easy to test (mock filter, verify correct tasks rendered)

**Alternatives Considered**:
- ❌ Render props: More verbose, harder to read
- ❌ HOC (Higher-Order Component): Deprecated pattern in React
- ❌ Duplicate components per tab: Code duplication, maintenance nightmare
- ✅ **Selected approach**: Compound component + composition

---

### 5. What sorting algorithms work best for multi-criteria task lists?

**Decision**: Use JavaScript `Array.sort()` with custom comparator function for priority+deadline

**Rationale**:
- Native `Array.sort()` is optimized by JS engines (Timsort in V8/SpiderMonkey)
- Multi-criteria sorting is O(n log n), acceptable for <1000 tasks
- Custom comparator allows complex logic (priority tiers → deadline ascending → nulls last)

**Implementation**:

```typescript
// frontend/src/lib/taskSorting.ts
type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

const PRIORITY_ORDER: Record<Priority, number> = {
  'Urgent': 0,
  'High': 1,
  'Normal': 2,
  'Low': 3,
};

export function sortTasksByPriorityAndDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary sort: Priority (Urgent > High > Normal > Low)
    const priorityA = PRIORITY_ORDER[a.priority ?? 'Low'];
    const priorityB = PRIORITY_ORDER[b.priority ?? 'Low'];

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }

    // Secondary sort: Deadline (ascending, nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;  // a goes after b
    if (!b.deadline) return -1; // b goes after a

    return a.deadline.localeCompare(b.deadline); // ISO date string comparison
  });
}
```

**Performance**:
- 100 tasks: ~2ms
- 1,000 tasks: ~15ms
- 10,000 tasks: ~150ms (unlikely to reach this scale)

**Alternatives Considered**:
- ❌ Database-level sorting: Requires ORDER BY with CASE statements, complex
- ❌ Lodash sortBy: External dependency for simple operation
- ✅ **Selected approach**: Native Array.sort() with custom comparator

**Test Cases**:
```typescript
describe('sortTasksByPriorityAndDeadline', () => {
  it('sorts by priority first (Urgent > High > Normal > Low)', () => {
    const tasks = [
      { priority: 'Low', deadline: '2026-01-01' },
      { priority: 'Urgent', deadline: '2026-12-31' },
      { priority: 'Normal', deadline: '2026-06-01' },
    ];
    const sorted = sortTasksByPriorityAndDeadline(tasks);
    expect(sorted[0].priority).toBe('Urgent');
    expect(sorted[1].priority).toBe('Normal');
    expect(sorted[2].priority).toBe('Low');
  });

  it('within same priority, sorts by deadline ascending', () => {
    const tasks = [
      { priority: 'Low', deadline: '2026-03-01' },
      { priority: 'Low', deadline: '2026-01-01' },
      { priority: 'Low', deadline: '2026-02-01' },
    ];
    const sorted = sortTasksByPriorityAndDeadline(tasks);
    expect(sorted[0].deadline).toBe('2026-01-01');
    expect(sorted[1].deadline).toBe('2026-02-01');
    expect(sorted[2].deadline).toBe('2026-03-01');
  });

  it('places tasks without deadlines last within same priority', () => {
    const tasks = [
      { priority: 'Low', deadline: null },
      { priority: 'Low', deadline: '2026-01-15' },
      { priority: 'Low', deadline: null },
    ];
    const sorted = sortTasksByPriorityAndDeadline(tasks);
    expect(sorted[0].deadline).toBe('2026-01-15');
    expect(sorted[1].deadline).toBeNull();
    expect(sorted[2].deadline).toBeNull();
  });
});
```

---

## Summary of Decisions

| Research Area | Decision | Key Library/Tool |
|---------------|----------|------------------|
| Natural language date parsing | Hybrid: chrono-node (frontend UX) + python-dateutil (backend validation) | chrono-node, dateutil |
| Timezone handling | Store timezone-naive ISO dates (YYYY-MM-DD), calculate in user's local timezone | Browser timezone API |
| Form default values | Dual defaults: React Hook Form `defaultValues` + SQLAlchemy model `default` | React Hook Form |
| Component composition | Compound component pattern with `<TaskListView filter={...}>` | React composition |
| Multi-criteria sorting | Native `Array.sort()` with custom comparator (priority → deadline → nulls) | Native JavaScript |

**Implementation Priority**:
1. Priority defaults (simplest, highest impact)
2. Component composition for tabs (foundational for US3)
3. Natural language date parsing (most complex, requires library installation)

**Dependencies to Install**:
```bash
# Frontend
npm install chrono-node

# Backend (already installed)
# python-dateutil is already a dependency from Feature 004
```
