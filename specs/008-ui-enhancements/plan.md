# Implementation Plan: Task Management UI Enhancements

**Branch**: `008-ui-enhancements` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-ui-enhancements/spec.md`

## Summary

This feature enhances the task management user experience through three independent improvements: (1) defaulting task priority to "Low" to reduce data entry friction, (2) converting natural language deadline inputs ("tomorrow", "next Friday") to ISO dates using Python's dateutil library, and (3) unifying the UI across Projects/Agenda/Persons tabs by reusing Todos components with filtering logic. The technical approach builds on existing React components and backend models without requiring new database tables or API endpoints - this is purely an enhancement to UI defaults, input parsing, and component reuse patterns.

**Primary Requirement**: Improve task entry and viewing UX through smarter defaults and consistent interfaces

**Technical Approach**: Frontend-focused enhancements leveraging python-dateutil for date parsing (already used in backend), React component composition for tab views, and default value handling in existing forms

## Technical Context

**Language/Version**: TypeScript 5.2+ (frontend), Python 3.11+ (backend - for date parsing validation)
**Primary Dependencies**:
- Frontend: React 18, @tanstack/react-query 5.x, shadcn/ui components (already in use)
- Backend: python-dateutil (already installed for Feature 004 metadata extraction)

**Storage**: SQLite via SQLAlchemy (existing - no schema changes required)
**Testing**:
- Frontend: Vitest + @testing-library/react (existing setup)
- Backend: pytest + pytest-asyncio (existing setup)
- E2E: Playwright (optional for tab navigation validation)

**Target Platform**: Web application (React SPA + FastAPI backend)

**Project Type**: Web - existing frontend/backend structure

**Performance Goals**:
- Priority default: Instant (<10ms UI update)
- Date parsing: <50ms for natural language conversion
- Tab switching: <200ms (component reuse should prevent re-renders)
- Cross-tab updates: <500ms (from SC-004)

**Constraints**:
- Must maintain backward compatibility with existing tasks (priority can be null → defaults to Low in UI)
- Must not break existing Task Workbench or Todos functionality
- Natural language date parsing must handle timezone-naive dates (UTC reference)
- Must preserve existing task sorting behavior for non-default priorities

**Scale/Scope**:
- 3 user stories (independently testable)
- 14 functional requirements
- ~5-8 frontend components (Priority selector, Deadline input, 3 tab views)
- ~1 backend utility function (date parsing validation)
- No new API endpoints (reuse existing task queries with filters)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Library-First Architecture: ✅ PASS (Not Applicable)

**Rationale**: This feature enhances existing UI components and data handling logic rather than creating new standalone functionality. The date parsing utility could be extracted as a micro-library but is more appropriately a shared utility given its 50-line scope. No new external-facing libraries are being created.

### Test-Driven Development: ✅ PASS

**Status**: TDD will be applied to all enhancements
**Testing Approach**:
  - **Unit Tests**:
    - Priority default behavior in form initialization
    - Natural language date parsing (12+ test cases for edge cases)
    - Sorting logic for same-priority tasks by deadline
  - **Integration Tests**:
    - Task creation with default priority flows through backend
    - Date parsing validation on metadata save
    - Tab filtering queries return correct subsets
  - **Component Tests**:
    - Priority selector shows "Low" when task.priority is null/undefined
    - Deadline input converts and displays ISO dates
    - Task cards render identically across all tabs
  - **E2E Tests** (optional):
    - Full user flows for each user story
    - Cross-tab update propagation within 500ms

**Rationale**: All new logic (date parsing, defaults, sorting) is testable in isolation. Existing TDD infrastructure supports this work.

### Clean Modular Architecture: ✅ PASS

**Status**: Enhancements maintain existing architecture
**Approach**:
  - Priority default: Handled in form initialization (frontend) and model default (backend Task model)
  - Date parsing: Shared utility function `parseNaturalLanguageDate()` in `frontend/src/lib/dateUtils.ts`
  - Tab views: Composition pattern - `<TaskListView filter={...}>` reused across tabs
  - No new module boundaries or dependencies introduced

**Rationale**: Feature works within existing clean architecture. No violations.

### Visual Documentation Standards: ✅ REQUIRED

**Status**: Architecture diagrams required
**Required Diagrams** (UI/Frontend Feature):
1. Component hierarchy diagram - showing how tab views compose TaskListView
2. User flow diagram - natural language date input → parsing → storage → display
3. State management diagram - priority default propagation through create/edit flows
4. Data flow between components - tab filter selection → query → task display

**Deliverable**: `architecture.md` with 4 Mermaid diagrams (Phase 1)

**Overall Constitution Compliance**: ✅ PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/008-ui-enhancements/
├── spec.md              # Feature specification (completed by /speckit.specify)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── architecture.md      # Phase 1 output - Mermaid diagrams
├── data-model.md        # Phase 1 output - existing Task model with priority default
├── quickstart.md        # Phase 1 output - developer testing guide
├── contracts/           # Phase 1 output - API examples (reusing existing endpoints)
├── checklists/
│   └── requirements.md  # Spec quality validation (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── task.py           # MODIFY: Add priority default="Low" to Task model
│   ├── services/
│   │   └── enrichment.py     # MODIFY: Ensure LLM extraction respects priority default
│   └── lib/
│       └── date_utils.py     # NEW (optional): Backend date validation if needed
└── tests/
    ├── unit/
    │   └── test_priority_defaults.py  # NEW: Test default priority behavior
    └── integration/
        └── test_task_sorting.py       # NEW: Test same-priority deadline sorting

frontend/
├── src/
│   ├── components/
│   │   ├── TaskWorkbench/
│   │   │   ├── MetadataEditor.tsx    # MODIFY: Set priority default to "Low"
│   │   │   └── DeadlineInput.tsx     # NEW: Natural language date input component
│   │   ├── TaskList/
│   │   │   └── TaskListView.tsx      # NEW: Reusable filtered task list component
│   │   ├── Tabs/
│   │   │   ├── TodosTab.tsx          # MODIFY: Use TaskListView with no filter
│   │   │   ├── ProjectsTab.tsx       # NEW: Use TaskListView with project filter
│   │   │   ├── AgendaTab.tsx         # NEW: Use TaskListView with deadline filter
│   │   │   └── PersonsTab.tsx        # NEW: Use TaskListView with person filter
│   │   └── TaskCard.tsx              # REUSE: Unchanged (already handles priority display)
│   ├── lib/
│   │   └── dateUtils.ts              # NEW: parseNaturalLanguageDate() utility
│   ├── hooks/
│   │   ├── useTasks.ts               # MODIFY: Add filter parameter support
│   │   └── useTaskSorting.ts         # NEW: Same-priority deadline sorting hook
│   └── types/
│       └── filters.ts                # NEW: TaskFilter types (project/deadline/person)
└── tests/
    ├── unit/
    │   ├── dateUtils.test.ts         # NEW: 12+ date parsing test cases
    │   ├── taskSorting.test.ts       # NEW: Priority/deadline sorting tests
    │   └── priorityDefaults.test.ts  # NEW: Default priority in forms
    ├── component/
    │   ├── DeadlineInput.test.tsx    # NEW: Natural language input tests
    │   ├── MetadataEditor.test.tsx   # MODIFY: Verify default priority
    │   └── TaskListView.test.tsx     # NEW: Filtering and composition tests
    └── e2e/ (optional)
        └── tabNavigation.spec.ts     # NEW: Cross-tab update propagation
```

**Structure Decision**: Web application structure (Option 2) - enhancements span both frontend (UI defaults, date parsing, tab views) and backend (priority default, sorting). No new top-level directories needed; all changes integrate into existing feature modules.

## Complexity Tracking

**No constitutional violations** - all changes work within existing architecture and principles.

---

## Phase 0: Outline & Research

### Research Tasks

Since this feature builds heavily on existing infrastructure, research focuses on best practices for the new components:

**Research Questions**:
1. What is the best JavaScript library for natural language date parsing that integrates with React?
2. How should we handle timezone considerations for deadline parsing (user local time vs UTC storage)?
3. What are best practices for default value handling in React forms with TanStack Query?
4. How should we implement component composition for filtered list views to maximize reuse?
5. What sorting algorithms work best for multi-criteria task lists (priority + deadline + nulls)?

**Output**: `research.md` documenting:
- Natural language date parsing library selection (chrono-node, date-fns/parse, or use backend python-dateutil)
- Timezone handling strategy for deadline storage
- React Hook Form default values pattern with React Query
- Component composition patterns for filtered views (render props vs hooks)
- Sorting implementation for priority/deadline combinations

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### Design Decisions

1. **Priority Default Strategy**:
   - Backend: Add `default="Low"` to Task model SQLAlchemy column
   - Frontend: Set `defaultValue="Low"` in Priority selector component
   - LLM: Update enrichment prompt to respect default if no priority detected

2. **Natural Language Date Parsing**:
   - Library: Use backend `python-dateutil` for parsing (already installed)
   - Frontend sends natural language input → Backend validates/parses → Returns ISO date
   - Fallback: If parsing fails, show validation error with examples

3. **Tab View Architecture**:
   - Create `<TaskListView filter={TaskFilter}>` component
   - Each tab passes filter object: `{ project: "Work" }`, `{ deadline: "2026-01-15" }`, `{ person: "Alice" }`
   - Reuse existing `useTasks()` hook with filter parameter
   - TaskCard component unchanged (already supports all needed display)

4. **Sorting Logic**:
   - Primary sort: priority (Urgent > High > Normal > Low)
   - Secondary sort (same priority): deadline ascending (nulls last)
   - Implementation: Array.sort() with custom comparator function

### Artifacts to Generate

1. **architecture.md**: 4 Mermaid diagrams
   - Component composition diagram (TaskListView reuse)
   - Date parsing flow (user input → backend → storage → display)
   - Priority default propagation (creation → enrichment → display)
   - Cross-tab update flow (edit in one tab → invalidate queries → refresh others)

2. **data-model.md**: Existing Task model with priority default annotation

3. **contracts/**: API usage examples
   - `GET /api/v1/todos?project=Work` - filtered task list
   - `GET /api/v1/todos?deadline=2026-01-15` - agenda view
   - `GET /api/v1/todos?person=Alice` - person view
   - `PATCH /api/v1/tasks/{id}/metadata` with deadline validation

4. **quickstart.md**: Developer testing guide
   - How to test default priority (create task without setting priority)
   - Natural language date input examples ("tomorrow", "next Friday", "in 2 weeks")
   - Tab navigation testing (verify same UI across tabs)
   - Cross-tab update testing (edit in Projects, verify update in Todos)

### Agent Context Update

After design artifacts are created, run:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This updates CLAUDE.md with:
- Date parsing library choice (python-dateutil or frontend equivalent)
- Component composition pattern for filtered views
- Priority default handling pattern

**Output**: architecture.md, data-model.md, contracts/, quickstart.md, updated CLAUDE.md

---

## Notes

This is a **UI enhancement feature** with minimal backend changes. The complexity is primarily in:
1. Natural language date parsing (requires library research + validation)
2. Component composition for tab views (design pattern decision)
3. Multi-criteria sorting (priority + deadline + nulls)

All three user stories are independently testable:
- US1 (Priority default): Test task creation without priority selection
- US2 (Date parsing): Test natural language input conversions
- US3 (Unified tabs): Test Projects/Agenda/Persons tabs display same UI

**Risk Assessment**: **LOW** - No database migrations, no new API endpoints, builds on existing components. Primary risk is date parsing edge cases (timezone handling, ambiguous dates like "next Monday on Monday").
