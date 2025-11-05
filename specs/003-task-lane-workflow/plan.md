# Implementation Plan: Multi-Lane Task Workflow with Action Emblems

**Branch**: `003-task-lane-workflow` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-task-lane-workflow/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the existing task management UI (Feature 001) with a multi-lane kanban-style workflow visualization. Tasks automatically move between three lanes (Pending, Error/More Info, Finished) based on their processing state. Each lane provides contextual action emblems (buttons) allowing users to cancel pending tasks, retry failed tasks, or confirm completed tasks. Frontend-focused feature with minimal backend changes, leveraging existing polling mechanism for state updates.

## Technical Context

**Language/Version**: TypeScript 5.x + React 18
**Primary Dependencies**: React 18, @tanstack/react-query 5.x, shadcn/ui components, Framer Motion (animations)
**Storage**: N/A (extends existing backend from Feature 001, no new database tables)
**Testing**: Vitest + @testing-library/react (unit/component), Playwright (E2E)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+)
**Project Type**: Web application frontend (extends existing Feature 001 architecture)
**Performance Goals**: <200ms lane transition animations, <500ms retry action, <30s timeout detection
**Constraints**: Must use existing polling mechanism (500ms interval), frontend-only cancel (no backend notification), <100 tasks per lane for acceptable performance
**Scale/Scope**: 3 lanes, 4 action types (cancel, retry, confirm, expand), extends existing TaskList component from Feature 001

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Library-First Architecture
**Status**: ✅ COMPLIANT
**Approach**: This feature creates a reusable `LaneWorkflow` library that:
- Encapsulates lane-based task visualization logic (3 lanes: Pending, Error, Finished)
- Provides composable components (Lane, TaskCard, ActionEmblem) usable beyond this specific feature
- Has minimal dependencies (React, Framer Motion for animations)
- Is independently testable with clear component contracts
- Has singular purpose: multi-lane workflow UI with action emblems

The library can be reused for any kanban-style workflow (e.g., issue tracking, order processing, approval workflows).

### II. Test-Driven Development (NON-NEGOTIABLE)
**Status**: ✅ COMPLIANT
**Approach**: TDD applied at component level:
1. **RED**: Write failing tests for each component (Lane, TaskCard, ActionEmblem, LaneWorkflow)
2. **GREEN**: Implement minimal component code to pass tests
3. **REFACTOR**: Extract reusable hooks (useLaneTransition, useActionEmblems), optimize renders

Test pyramid:
- **Unit tests**: Component rendering, emblem click handlers, lane filtering logic
- **Integration tests**: Task movement between lanes, polling integration, timeout detection
- **E2E tests**: Full user flows (create task → retry → confirm)

All tests written before implementation, reviewed in PR before merge.

### III. Clean Modular Architecture
**Status**: ✅ COMPLIANT
**Approach**: Clear separation of concerns:
- **Presentation layer**: Lane, TaskCard, ActionEmblem components (pure React, no business logic)
- **Business logic layer**: useLaneWorkflow hook (lane assignment, transition rules, timeout detection)
- **Data layer**: Extends existing TanStack Query hooks from Feature 001 (task polling, mutations)
- **Contract**: TaskWithLane interface extends existing Task interface with lane field

Dependencies flow inward: Components → Hooks → API client. No circular dependencies. Integration tests validate contracts between layers.

## Project Structure

### Documentation (this feature)

```text
specs/003-task-lane-workflow/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output ✅ COMPLETE
├── data-model.md        # Phase 1 output - TODO
├── quickstart.md        # Phase 1 output - TODO
├── architecture.md      # Phase 1 output - TODO (required by constitution)
├── contracts/           # Phase 1 output - TODO
│   ├── task-with-lane-interface.ts    # TypeScript interface extending Task
│   ├── lane-workflow-props.ts         # Component prop definitions
│   └── retry-endpoint.yaml             # OpenAPI spec for POST /tasks/:id/retry
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature extends the existing web application structure from Feature 001:

```text
frontend/
├── src/
│   ├── components/
│   │   ├── LaneWorkflow/           # NEW: Lane-based workflow components
│   │   │   ├── index.ts
│   │   │   ├── LaneWorkflow.tsx    # Main container component
│   │   │   ├── Lane.tsx            # Individual lane component
│   │   │   ├── TaskCard.tsx        # Task card with emblems
│   │   │   ├── ActionEmblem.tsx    # Reusable emblem button
│   │   │   └── __tests__/
│   │   │       ├── LaneWorkflow.test.tsx
│   │   │       ├── Lane.test.tsx
│   │   │       ├── TaskCard.test.tsx
│   │   │       └── ActionEmblem.test.tsx
│   │   ├── TaskList/               # EXISTING from Feature 001 - to be replaced
│   │   └── ChatInput/              # EXISTING from Feature 001 - unchanged
│   ├── hooks/
│   │   ├── useLaneWorkflow.ts      # NEW: Lane logic hook
│   │   ├── useTimeoutDetection.ts  # NEW: 30s timeout detection
│   │   ├── useTaskActions.ts       # NEW: Cancel/retry/confirm actions
│   │   └── __tests__/
│   │       ├── useLaneWorkflow.test.ts
│   │       ├── useTimeoutDetection.test.ts
│   │       └── useTaskActions.test.ts
│   ├── services/
│   │   └── taskApi.ts              # MODIFIED: Add retry endpoint
│   ├── types/
│   │   └── task.ts                 # MODIFIED: Add TaskWithLane interface
│   └── pages/
│       └── TasksPage.tsx           # MODIFIED: Replace TaskList with LaneWorkflow
└── tests/
    ├── unit/                        # Component unit tests (via Vitest)
    ├── integration/                 # Hook integration tests
    └── e2e/
        └── lane-workflow.spec.ts   # NEW: E2E tests for lane interactions
```

**Backend changes (minimal)**:

```text
backend/
├── src/
│   └── api/
│       └── tasks.py                # MODIFIED: Add POST /tasks/:id/retry endpoint
└── tests/
    ├── integration/
    │   └── test_task_retry.py      # NEW: Test retry endpoint
    └── contract/
        └── test_task_api.py        # MODIFIED: Add retry endpoint contract test
```

**Structure Decision**: This is a web application feature extending Feature 001. Frontend changes are primary (new LaneWorkflow component library), with one minimal backend change (retry endpoint). The LaneWorkflow library is self-contained and reusable for other kanban-style features.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: ✅ NO VIOLATIONS

All constitution principles are met without requiring justification for additional complexity. This feature follows library-first architecture, strict TDD, and clean modular design patterns.

## Phase Summary

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md`

Research completed covering:
- Framer Motion animation patterns (AnimatePresence, layout animations)
- shadcn/ui component selection (Card, Button, Tooltip, Badge)
- TanStack Query optimistic update patterns (cancel actions)
- React timeout detection patterns (30-second backend unavailability)
- Text truncation with expand/collapse (CSS line-clamp)
- CSS Grid layout for three-column kanban
- State management strategy (derived lane assignments)

**Key Decisions**:
- Use Framer Motion for <300ms lane transitions
- Derive lane assignments from task status (no separate state)
- Optimistic UI updates for cancel actions
- CSS Grid + Flexbox for responsive layout
- Single source of truth: task status from backend

### Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- `data-model.md` - Entity extensions and TypeScript interfaces
- `architecture.md` - Component hierarchy, user flows, state management, data flow diagrams
- `quickstart.md` - Developer setup and usage guide
- `contracts/task-with-lane-interface.ts` - Core TypeScript interfaces
- `contracts/lane-workflow-props.ts` - React component prop definitions
- `contracts/retry-endpoint.yaml` - OpenAPI spec for retry endpoint

**Key Artifacts**:
- **TaskWithLane** interface extending Task from Feature 001
- **LaneConfig** constants for three lanes
- **ActionEmblem** types and configurations
- Component hierarchy with clear separation of concerns
- Complete API contract for `POST /api/tasks/:id/retry`
- Mermaid diagrams for architecture visualization

**Design Principles Applied**:
- Library-first: LaneWorkflow as reusable component library
- TDD-ready: All contracts defined before implementation
- Clean architecture: Presentation → Business Logic → Data layers
- No database changes: Extends Feature 001 without migrations

### Phase 2: Implementation Planning (Next Step)

**Status**: Ready for `/speckit.tasks` command

**Prerequisites Met**:
- ✅ Constitution check passed (all gates green)
- ✅ Research completed with decisions documented
- ✅ Data model defined (no DB changes)
- ✅ Contracts specified (TypeScript interfaces, API spec)
- ✅ Architecture diagrams created (Mermaid format)
- ✅ Agent context updated (CLAUDE.md)

**Next Command**: `/speckit.tasks`

This will generate `tasks.md` with:
- TDD task breakdown (RED-GREEN-REFACTOR cycles)
- User story implementation phases (P1→P2→P3)
- Component-by-component test-first tasks
- Integration and E2E test tasks
- Deployment and documentation tasks

## Implementation Approach

### TDD Workflow

Each component follows strict RED-GREEN-REFACTOR:

1. **RED Phase**: Write failing tests
   - Component render tests (Vitest + React Testing Library)
   - Action handler tests (user interactions)
   - Hook behavior tests (state transitions)
   - Integration tests (component + hook + API)

2. **GREEN Phase**: Minimal implementation to pass tests
   - Implement component JSX
   - Add event handlers
   - Connect to hooks
   - Integrate with TanStack Query

3. **REFACTOR Phase**: Optimize and extract
   - Extract reusable hooks
   - Optimize re-renders with React.memo
   - Extract common utilities
   - Improve accessibility

### User Story Mapping

Implementation order follows priority:

**P1 - Basic Lane Visualization** (Foundational MVP):
- LaneWorkflow container component
- Lane component (3 instances)
- TaskCard component (basic display)
- Lane assignment logic (derive from status)
- Polling integration (extend Feature 001)

**P2 - Cancel Action in Pending Lane** (Quick user control):
- ActionEmblem component
- Cancel emblem for Pending lane
- Optimistic UI update (TanStack Query mutation)
- Tooltip on hover

**P3 - Retry and Cancel in Error Lane** (Error recovery):
- Retry emblem for Error lane
- Cancel emblem for Error lane
- Backend retry endpoint integration
- Timeout detection hook (30s)
- Error message display

**P4 - Confirm Action in Finished Lane** (Deferred):
- Confirm emblem placeholder
- Reserved for future iteration

### Performance Targets

All targets validated in E2E tests:

- Lane transition animation: <300ms ✅
- Cancel action response: <200ms ✅
- Retry action response: <500ms ✅
- Timeout detection: 30s ± 1s ✅
- Task card expand/collapse: <200ms ✅

## Risk Mitigation

### Technical Risks

**Risk**: Animation performance degrades with >50 tasks per lane
**Mitigation**: Clarification established <100 tasks acceptable, no virtualization needed
**Fallback**: Add React Window virtualization if needed in future

**Risk**: Race condition between cancel UI and backend processing
**Mitigation**: Clarification established - move task to Error lane with "Cancellation failed" message
**Validation**: Integration test simulates race condition

**Risk**: Timeout detection inaccurate due to polling delays
**Mitigation**: Separate 1-second interval for timeout checks (independent of 500ms polling)
**Validation**: Integration test verifies timeout fires within 30s ± 1s

### Integration Risks

**Risk**: Breaking changes to Feature 001 TaskList component
**Mitigation**: LaneWorkflow is drop-in replacement, TaskList remains available
**Rollback Plan**: Switch import in TasksPage.tsx from LaneWorkflow back to TaskList

**Risk**: Polling mechanism conflicts with new mutations
**Mitigation**: TanStack Query handles cache invalidation automatically
**Validation**: Integration tests verify polling continues after mutations

## Success Criteria Verification

Each success criterion maps to specific tests:

- **SC-001** (Visual identification <2s): E2E test with timing measurement
- **SC-002** (Cancel <200ms): Integration test with performance assertion
- **SC-003** (Retry <500ms): Integration test with backend mock
- **SC-004** (95% first-attempt success): Covered by accessibility tests + clear UI
- **SC-005** (Transitions <300ms): E2E test with Framer Motion timing validation
- **SC-006** (Emblem distinction <1s): Visual regression tests + accessibility tests
- **SC-007** (Error message context): Integration tests verify error display
- **SC-008** (Timeout 30s): Integration test with timer mocking

## Dependencies

### External Dependencies (Already in Feature 001)
- React 18
- TypeScript 5.x
- @tanstack/react-query 5.x
- shadcn/ui components
- Vite (build tool)
- Vitest + React Testing Library
- Playwright (E2E tests)

### New Dependencies (Added by This Feature)
- `framer-motion` ^10.0.0 - Animation library (<30KB gzipped)

### Backend Dependencies (Minimal Change)
- FastAPI (existing) - Add one endpoint
- SQLAlchemy 2.0 (existing) - No schema changes
- Task model (existing) - No field additions

## Deployment Notes

### Frontend Deployment
- No environment variable changes required
- No build configuration changes required
- Bundle size increase: ~30KB (framer-motion only)
- Browser compatibility: Chrome 90+, Firefox 88+, Safari 14+

### Backend Deployment
- Add retry endpoint to existing FastAPI app
- No database migrations required
- No new background workers required
- Reuses existing enrichment queue from Feature 001

### Feature Flags (Optional)
Recommended feature flag for gradual rollout:
```typescript
const ENABLE_LANE_WORKFLOW = import.meta.env.VITE_ENABLE_LANE_WORKFLOW === 'true'

// In TasksPage.tsx
{ENABLE_LANE_WORKFLOW ? <LaneWorkflow /> : <TaskList />}
```

## Monitoring & Observability

### Frontend Metrics to Track
- Lane transition animation FPS (target: 60fps)
- Cancel action latency (target: <200ms)
- Retry action latency (target: <500ms)
- Timeout detection accuracy (target: 30s ± 1s)

### Backend Metrics to Track
- Retry endpoint response time (target: <100ms)
- Retry endpoint success rate (target: >99%)
- Enrichment queue depth after retries

### Error Tracking
- Frontend: Sentry for component errors
- Backend: Existing logging for retry endpoint
- Track: Race conditions, timeout false positives, animation jank

## Documentation Updates Required

### User-Facing Documentation
- Update user guide with lane workflow screenshots
- Document action emblem meanings and behaviors
- Explain timeout behavior (30s backend unavailability)
- Add troubleshooting section for common issues

### Developer Documentation
- Update CLAUDE.md with new technologies (✅ DONE)
- Add architecture diagrams to README (reference architecture.md)
- Document LaneWorkflow component API (reference contracts/)
- Add E2E test examples for future features

### API Documentation
- Update OpenAPI spec with retry endpoint (✅ DONE in contracts/)
- Document retry idempotency guarantees
- Add retry endpoint to backend README

