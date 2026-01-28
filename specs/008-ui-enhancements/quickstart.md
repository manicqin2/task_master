# Developer Quickstart: Task Management UI Enhancements

**Feature**: 008-ui-enhancements
**Date**: 2026-01-06
**Purpose**: Guide developers through testing and validating the three UI enhancements

## Prerequisites

- Docker and docker-compose installed
- Node.js 18+ and npm installed
- Python 3.11+ and pip installed (for backend testing)
- Task Master development environment running (`docker compose up`)

## Feature Overview

This feature enhances the task management UI through three independent improvements:

1. **Priority Default to "Low"** (US1 - P1): Tasks automatically get Low priority unless specified
2. **Natural Language Deadlines** (US2 - P2): Convert "tomorrow", "next Friday" to ISO dates
3. **Unified Tab Views** (US3 - P3): Projects/Agenda/Persons tabs reuse Todos UI with filtering

---

## Quick Start: Testing Each Enhancement

### Enhancement 1: Priority Default (P1 - Highest Priority)

**What to Test**: Tasks without explicit priority should default to "Low"

#### Test 1.1: Create Task Without Priority

1. **Start the application**:
   ```bash
   docker compose up
   ```

2. **Open frontend**: http://localhost:3000

3. **Create a task** in the chat input:
   ```
   Buy milk
   ```

4. **Expected Result**:
   - Task appears in Task Workbench "Pending" lane
   - After enrichment, task shows **Low priority badge** (🔵 Low)
   - In "More Info" lane, priority selector **defaults to "Low"**

5. **Verify in database**:
   ```bash
   docker compose exec backend python -c "
   from src.lib.database import SessionLocal
   from src.models.task import Task
   db = SessionLocal()
   task = db.query(Task).order_by(Task.id.desc()).first()
   print(f'Priority: {task.priority}')  # Should print: Priority: Low
   db.close()
   "
   ```

#### Test 1.2: Verify MetadataEditor Default

1. Create task that needs attention (fails enrichment or missing project)
2. Task lands in "More Info" lane
3. Open metadata editor
4. **Expected**: Priority dropdown shows "Low" pre-selected

#### Test 1.3: Override Default Priority

1. Create task: `URGENT: Fix production bug`
2. LLM should detect urgency and set priority to "Urgent" or "High"
3. **Expected**: Priority badge shows detected priority, NOT default "Low"

**Success Criteria** (SC-001):
✅ 100% of tasks without explicit priority display "Low" priority

---

### Enhancement 2: Natural Language Deadline Conversion (P2)

**What to Test**: Deadline inputs like "tomorrow", "next Friday" convert to ISO dates

#### Test 2.1: Basic Natural Language Dates

1. **Create task and set deadline in metadata editor**:

   | Input | Expected ISO Date (assuming today = 2026-01-06 Monday) |
   |-------|-------------------------------------------------------|
   | `tomorrow` | `2026-01-07` |
   | `today` | `2026-01-06` |
   | `next Friday` | `2026-01-10` |
   | `in 2 weeks` | `2026-01-20` |
   | `in 3 days` | `2026-01-09` |

2. **Steps**:
   - Create task: `Review PR`
   - Task moves to "More Info" lane (needs project)
   - Open metadata editor
   - Set project: `Work`
   - Set deadline: `tomorrow`
   - Click "Move to Ready"

3. **Expected Result**:
   - Deadline field shows ISO date preview: `2026-01-07`
   - After save, deadline displays as `2026-01-07` (not "tomorrow")
   - Task card shows deadline indicator: 📅 `2026-01-07`

#### Test 2.2: Edge Case - "next Monday" on Monday (FR-013)

1. **Test on a Monday** (e.g., 2026-01-06):
   - Input: `next Monday`
   - **Expected**: `2026-01-13` (7 days from now, NOT today)

2. **Rationale**: "next" always means future occurrence, not current day

#### Test 2.3: Invalid Deadline Input (FR-006)

1. **Try invalid input**:
   - Input: `someday`
   - **Expected**: Validation error with helpful message:
     ```
     Could not parse deadline 'someday'
     Try formats like: 'tomorrow', 'next Friday', 'in 2 weeks', or 'YYYY-MM-DD'
     ```

2. **Frontend instant validation**: Error shows immediately (via chrono-node parsing)
3. **Backend validation**: Rejects invalid input on save (python-dateutil validation)

#### Test 2.4: Deadline Persistence (FR-011)

1. **Create task with deadline "tomorrow"** (2026-01-06):
   - Stored as: `2026-01-07`

2. **View task next day** (2026-01-07):
   - Deadline still shows: `2026-01-07` (NOT recalculated to "tomorrow" = 2026-01-08)

3. **Edit task again** (2026-01-10):
   - Deadline field shows: `2026-01-07` (ISO date, NOT original phrase "tomorrow")

**Success Criteria** (SC-002):
✅ 90%+ accuracy for common phrases (tomorrow, next Friday, in N days/weeks)

---

### Enhancement 3: Unified Tab Views (P3)

**What to Test**: Projects, Agenda, Persons tabs show same UI as Todos with filtering

#### Test 3.1: Projects Tab Filtering

1. **Create tasks with different projects**:
   ```
   Task 1: "Review PR" (project: Work)
   Task 2: "Buy milk" (project: Personal)
   Task 3: "Prepare slides" (project: Work)
   ```

2. **Move tasks to "Ready" lane** (add required metadata)

3. **Click arrow to move to Todos**

4. **Navigate to Projects tab**:
   - Select project: `Work`
   - **Expected**: Shows ONLY Task 1 and Task 3 (Work tasks)
   - Task cards look **identical** to Todos tab (same component)

5. **Verify filtering**:
   ```bash
   curl http://localhost:8000/api/v1/todos?project=Work
   # Should return only tasks with project="Work"
   ```

#### Test 3.2: Agenda Tab Filtering

1. **Create tasks with deadlines**:
   ```
   Task 1: deadline = 2026-01-10
   Task 2: deadline = 2026-01-15
   Task 3: deadline = 2026-01-10
   ```

2. **Navigate to Agenda tab**:
   - Select date: `2026-01-10`
   - **Expected**: Shows ONLY Task 1 and Task 3
   - Calendar or date picker interface
   - Task cards identical to Todos tab

#### Test 3.3: Persons Tab Filtering

1. **Create tasks with person assignments**:
   ```
   Task 1: persons = ["Alice"]
   Task 2: persons = ["Bob"]
   Task 3: persons = ["Alice", "Bob"]
   ```

2. **Navigate to Persons tab**:
   - Select person: `Alice`
   - **Expected**: Shows Task 1 and Task 3 (tasks assigned to Alice)
   - Task cards identical to Todos tab

#### Test 3.4: Cross-Tab Update Propagation (SC-004)

1. **Open two browser tabs** (or split view):
   - Tab A: Todos view
   - Tab B: Projects view (filtered to "Work")

2. **Complete a task in Tab A** (mark as done):
   - Click checkbox on task

3. **Expected** (within 500ms):
   - Tab A: Task moves to completed section
   - Tab B: Task disappears from Projects view OR moves to completed
   - React Query invalidates cache and refetches

4. **Verify timing**:
   ```typescript
   // In browser dev tools console:
   performance.mark('task-update-start');
   // Complete task
   // Wait for other tab to update
   performance.mark('task-update-end');
   performance.measure('cross-tab-update', 'task-update-start', 'task-update-end');
   console.log(performance.getEntriesByName('cross-tab-update')[0].duration);
   // Should be < 500ms
   ```

**Success Criteria** (SC-003, SC-004):
✅ All four tab views use identical task card components
✅ Task state changes reflect within 500ms in all views

---

## Testing Checklist

### Priority Default (US1)
- [ ] Task created without priority shows "Low" badge
- [ ] Metadata editor pre-selects "Low" when priority is null
- [ ] LLM can override default priority (e.g., detect "URGENT")
- [ ] Backend model default works (check database)

### Natural Language Deadlines (US2)
- [ ] "tomorrow" converts to correct ISO date
- [ ] "next Friday" converts correctly
- [ ] "in 2 weeks" converts correctly
- [ ] Absolute dates (YYYY-MM-DD) pass through unchanged
- [ ] Invalid inputs show helpful error messages
- [ ] "next Monday" on Monday = +7 days (not today)
- [ ] Deadlines don't recalculate on subsequent views
- [ ] Edit shows ISO date, not original phrase

### Unified Tab Views (US3)
- [ ] Projects tab shows same UI as Todos
- [ ] Agenda tab shows same UI as Todos
- [ ] Persons tab shows same UI as Todos
- [ ] Filtering works correctly (only relevant tasks shown)
- [ ] Task actions (complete, edit, delete) work in all tabs
- [ ] Cross-tab updates propagate within 500ms

### Sorting (Edge Cases)
- [ ] Tasks sort by priority first (Urgent > High > Normal > Low)
- [ ] Within same priority, sort by deadline (earliest first)
- [ ] Tasks without deadlines appear last in their priority group

---

## Running Tests

### Frontend Unit Tests

```bash
cd frontend
npm run test

# Run specific test files:
npm run test dateUtils.test.ts
npm run test taskSorting.test.ts
npm run test priorityDefaults.test.ts
```

**Expected Coverage**:
- Date parsing: 12+ test cases (edge cases like "next Monday on Monday")
- Task sorting: Multi-criteria sorting with nulls
- Priority defaults: Form initialization

### Frontend Component Tests

```bash
npm run test DeadlineInput.test.tsx
npm run test MetadataEditor.test.tsx
npm run test TaskListView.test.tsx
```

**What's Tested**:
- DeadlineInput: User types "tomorrow", sees preview, saves, displays ISO date
- MetadataEditor: Priority defaults to "Low" when task.priority is null
- TaskListView: Filter prop correctly filters tasks

### Backend Unit Tests

```bash
cd backend
pytest tests/unit/test_priority_defaults.py
pytest tests/unit/test_date_parsing.py
```

**What's Tested**:
- Priority default at model level
- Natural language date parsing (python-dateutil)
- Edge cases (tomorrow, next Monday, in N weeks)

### Backend Integration Tests

```bash
pytest tests/integration/test_task_sorting.py
pytest tests/integration/test_filtered_queries.py
```

**What's Tested**:
- Tasks sorted by priority + deadline
- Query filtering (project, deadline, person)
- Null deadline handling

### E2E Tests (Optional)

```bash
cd frontend
npm run test:e2e
```

**What's Tested**:
- Full user flows for each user story
- Cross-tab update propagation timing
- Tab navigation and filtering

---

## Troubleshooting

### Issue: Priority doesn't default to "Low"

**Check**:
1. Backend model has `default="Low"`:
   ```python
   # backend/src/models/task.py
   priority: Mapped[str | None] = mapped_column(String, default="Low")
   ```

2. Frontend form sets defaultValues:
   ```typescript
   const { register } = useForm({
     defaultValues: { priority: task.priority ?? 'Low' }
   });
   ```

3. Restart docker containers to apply model changes

### Issue: Natural language dates not parsing

**Check**:
1. chrono-node installed:
   ```bash
   cd frontend
   npm list chrono-node
   ```

2. Backend python-dateutil installed:
   ```bash
   docker compose exec backend pip list | grep dateutil
   ```

3. Check browser console for parsing errors
4. Check backend logs for validation errors

### Issue: Tabs show wrong tasks

**Check**:
1. React Query cache key includes filter:
   ```typescript
   queryKey: ['todos', filter]  // Must include filter for isolation
   ```

2. API endpoint receives query parameters:
   ```bash
   curl http://localhost:8000/api/v1/todos?project=Work
   # Check response includes only Work tasks
   ```

3. Clear React Query cache:
   ```typescript
   // In browser console
   queryClient.clear()
   ```

### Issue: Cross-tab updates are slow

**Check**:
1. React Query invalidation on mutation:
   ```typescript
   queryClient.invalidateQueries(['todos'])
   ```

2. Network latency (check browser dev tools Network tab)
3. Ensure refetchOnWindowFocus is enabled (React Query default)

---

## Next Steps

After validating all enhancements:

1. **Run full test suite**: Ensure no regressions
   ```bash
   cd backend && pytest
   cd frontend && npm run test
   ```

2. **Check code coverage**:
   ```bash
   cd backend && pytest --cov=src
   cd frontend && npm run test:coverage
   ```

3. **Manual QA**: Test each user story independently (per acceptance scenarios)

4. **Performance testing**: Measure cross-tab update timing (should be <500ms)

5. **Create pull request**: Include test results and screenshots of UI changes

6. **Deploy to staging**: Validate in production-like environment

---

## Additional Resources

- **Research Document**: [research.md](./research.md) - Library choices and implementation decisions
- **Architecture Diagrams**: [architecture.md](./architecture.md) - Component composition and data flow
- **API Examples**: [contracts/api-examples.md](./contracts/api-examples.md) - Request/response samples
- **Data Model**: [data-model.md](./data-model.md) - Task model enhancements

---

## Summary

**Time to Test All Enhancements**: ~30 minutes

**Key Validation Points**:
1. ✅ Priority defaults to "Low" (US1)
2. ✅ Natural language dates convert to ISO (US2)
3. ✅ All tabs show identical UI with filtering (US3)
4. ✅ Cross-tab updates within 500ms (SC-004)
5. ✅ Sorting by priority + deadline works (FR-012)

**Success Criteria Met**: All 5 success criteria (SC-001 through SC-005) validated through manual and automated testing.
