# Tasks: Playwright End-to-End Tests

**Input**: Design documents from `/specs/009-playwright-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: This feature IS the tests - all tasks create test infrastructure and test files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend E2E tests**: `frontend/tests/e2e/`
- **Fixtures**: `frontend/tests/e2e/fixtures/`
- **Page Objects**: `frontend/tests/e2e/pages/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Playwright and create foundational test infrastructure

- [ ] T001 Add @playwright/test dependency to frontend/package.json devDependencies
- [ ] T002 Add test scripts (test:e2e, test:e2e:ui, test:e2e:headed) to frontend/package.json
- [ ] T003 Run `npx playwright install` to download browser binaries
- [ ] T004 [P] Update frontend/playwright.config.ts with JUnit reporter for CI/CD

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create Page Objects and fixtures that ALL user stories depend on

**⚠️ CRITICAL**: No user story test can be implemented until this phase is complete

- [ ] T005 Create base page class in frontend/tests/e2e/pages/base.page.ts
- [ ] T006 [P] Create WorkbenchPage page object in frontend/tests/e2e/pages/workbench.page.ts
- [ ] T007 [P] Create TodosPage page object in frontend/tests/e2e/pages/todos.page.ts
- [ ] T008 Create API helpers for test isolation in frontend/tests/e2e/fixtures/api-helpers.ts
- [ ] T009 Create extended test fixtures in frontend/tests/e2e/fixtures/test-fixtures.ts
- [ ] T010 Export fixtures from frontend/tests/e2e/fixtures/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Task Creation Workflow Testing (Priority: P1) 🎯 MVP

**Goal**: Verify users can create tasks through the chat interface and see them in the Pending lane

**Independent Test**: Run `npx playwright test task-entry.spec.ts` - should pass all task creation scenarios

### Implementation for User Story 1

> Note: task-entry.spec.ts EXISTS but needs updates to use Page Objects and fixtures

- [ ] T011 [US1] Refactor frontend/tests/e2e/task-entry.spec.ts to use WorkbenchPage page object
- [ ] T012 [US1] Add test: submit task via button click shows task in Pending lane within 2s
- [ ] T013 [US1] Add test: submit task via Enter key shows task in Pending lane
- [ ] T014 [US1] Add test: empty input submission prevents task creation and keeps focus
- [ ] T015 [US1] Add test: input field clears after successful submission
- [ ] T016 [US1] Add beforeEach cleanup using api-helpers to ensure test isolation

**Checkpoint**: User Story 1 complete - task creation workflow verified independently

---

## Phase 4: User Story 2 - Lane Workflow Happy Path Testing (Priority: P1)

**Goal**: Verify tasks transition from Pending to Ready lane after successful enrichment

**Independent Test**: Run `npx playwright test lane-workflow.spec.ts` - should pass all lane transition scenarios

### Implementation for User Story 2

> Note: lane-workflow.spec.ts EXISTS but needs updates to use Page Objects

- [ ] T017 [US2] Refactor frontend/tests/e2e/lane-workflow.spec.ts to use WorkbenchPage page object
- [ ] T018 [US2] Add test: task moves from Pending to Ready lane after enrichment completes
- [ ] T019 [US2] Add test: click confirm action on Ready lane task moves it to Todos view
- [ ] T020 [US2] Add test: enriched task displays metadata (project, priority, deadline)
- [ ] T021 [US2] Add test: multiple tasks maintain correct order (newest first)
- [ ] T022 [US2] Configure 35s timeout for enrichment tests (LLM can take up to 30s)

**Checkpoint**: User Story 2 complete - lane workflow verified independently

---

## Phase 5: User Story 3 - Error Handling and Retry Testing (Priority: P2)

**Goal**: Verify application handles failures gracefully with retry functionality

**Independent Test**: Run `npx playwright test retry-workflow.spec.ts cancel-pending.spec.ts` - should pass all error scenarios

### Implementation for User Story 3

> Note: retry-workflow.spec.ts and cancel-pending.spec.ts EXIST but need Page Object integration

- [ ] T023 [US3] Refactor frontend/tests/e2e/retry-workflow.spec.ts to use WorkbenchPage page object
- [ ] T024 [US3] Refactor frontend/tests/e2e/cancel-pending.spec.ts to use WorkbenchPage page object
- [ ] T025 [US3] Add test: failed enrichment moves task to More Info lane with error message
- [ ] T026 [US3] Add test: clicking Retry button moves task back to Pending lane
- [ ] T027 [US3] Add test: clicking Cancel button removes task from workflow
- [ ] T028 [US3] Add page.route() mock for deterministic failure simulation in retry tests

**Checkpoint**: User Story 3 complete - error handling and retry verified independently

---

## Phase 6: User Story 4 - Tab Navigation Testing (Priority: P2)

**Goal**: Verify users can switch between Workbench and Todos views reliably

**Independent Test**: Run `npx playwright test navigation.spec.ts` - should pass all navigation scenarios

### Implementation for User Story 4

> Note: navigation.spec.ts is NEW - create from scratch

- [ ] T029 [P] [US4] Create frontend/tests/e2e/navigation.spec.ts test file
- [ ] T030 [US4] Add test: clicking Todos tab from Workbench displays todo list view
- [ ] T031 [US4] Add test: clicking Workbench tab from Todos displays lane workflow view
- [ ] T032 [US4] Add test: tab state is preserved when navigating back to previous tab
- [ ] T033 [US4] Add test: verify all tab buttons are visible and accessible

**Checkpoint**: User Story 4 complete - tab navigation verified independently

---

## Phase 7: User Story 5 - Todo List Management Testing (Priority: P2)

**Goal**: Verify users can mark tasks complete and archive them in the Todos view

**Independent Test**: Run `npx playwright test todo-management.spec.ts` - should pass all todo management scenarios

### Implementation for User Story 5

> Note: todo-management.spec.ts is NEW - create from scratch

- [ ] T034 [P] [US5] Create frontend/tests/e2e/todo-management.spec.ts test file
- [ ] T035 [US5] Add test setup: create task via API and move to Todos via confirm action
- [ ] T036 [US5] Add test: marking task as completed shows finished status
- [ ] T037 [US5] Add test: archiving completed task removes it from active list
- [ ] T038 [US5] Add test: toggling "show finished" off hides completed tasks
- [ ] T039 [US5] Add test: toggling "show finished" on reveals completed tasks

**Checkpoint**: User Story 5 complete - todo management verified independently

---

## Phase 8: User Story 6 - Performance Testing (Priority: P3)

**Goal**: Verify application remains responsive under normal and high-load conditions

**Independent Test**: Run `npx playwright test --grep performance` - should pass all performance thresholds

### Implementation for User Story 6

> Note: Performance test files EXIST but may need updates

- [ ] T040 [US6] Update frontend/tests/e2e/animation-performance.spec.ts to use fixtures
- [ ] T041 [US6] Update frontend/tests/e2e/large-dataset-performance.spec.ts to use fixtures
- [ ] T042 [US6] Add test: task creation to visibility completes in under 2 seconds
- [ ] T043 [US6] Add test: 50+ tasks in workflow maintains acceptable operation times
- [ ] T044 [US6] Add test: animations maintain at least 30 FPS

**Checkpoint**: User Story 6 complete - performance thresholds verified

---

## Phase 9: Edge Cases

**Goal**: Verify application handles boundary conditions gracefully

**Independent Test**: Run `npx playwright test edge-cases.spec.ts` - should handle all edge scenarios

### Implementation for Edge Cases

> Note: edge-cases.spec.ts is NEW - create from scratch

- [ ] T045 [P] Create frontend/tests/e2e/edge-cases.spec.ts test file
- [ ] T046 Add test: backend unavailable shows appropriate error state
- [ ] T047 Add test: task description over 1000 characters is handled correctly
- [ ] T048 Add test: rapid task submission (5 tasks in quick succession) works correctly
- [ ] T049 Add test: mobile viewport (375x667) displays UI correctly
- [ ] T050 Add test: page refresh with tasks in Pending state recovers correctly

**Checkpoint**: Edge cases complete - boundary conditions verified

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T051 Run all tests and verify no flaky tests (run 3x in CI mode)
- [ ] T052 [P] Update frontend/tests/e2e/README.md with test organization and running instructions
- [ ] T053 Verify test suite completes in under 5 minutes
- [ ] T054 [P] Configure GitHub/GitLab CI to run E2E tests on PR
- [ ] T055 Run quickstart.md validation - ensure all documented commands work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - US1 and US2 (P1): Start first, in parallel or sequentially
  - US3, US4, US5 (P2): Can start after Foundational, in parallel
  - US6 and Edge Cases (P3): Can start after Foundational
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on Foundational - Can run parallel with US1
- **User Story 3 (P2)**: Depends on Foundational - Can run parallel with US1/US2
- **User Story 4 (P2)**: Depends on Foundational - Can run parallel with US1/US2/US3
- **User Story 5 (P2)**: Depends on Foundational - Needs navigation to work (soft dependency on US4)
- **User Story 6 (P3)**: Depends on Foundational - Independent
- **Edge Cases**: Depends on Foundational - Independent

### Within Each User Story

- Refactor existing tests to use Page Objects first
- Add new test cases after Page Object integration
- Each story complete before marking phase done

### Parallel Opportunities

- T003 and T004 can run in parallel (different concerns)
- T006 and T007 can run in parallel (different page objects)
- All [P] marked tasks within a phase can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch page objects in parallel:
Task: "Create WorkbenchPage page object in frontend/tests/e2e/pages/workbench.page.ts"
Task: "Create TodosPage page object in frontend/tests/e2e/pages/todos.page.ts"
```

## Parallel Example: P2 User Stories

```bash
# After Foundational complete, launch in parallel:
Task: "[US3] Refactor retry-workflow.spec.ts to use WorkbenchPage"
Task: "[US4] Create navigation.spec.ts test file"
Task: "[US5] Create todo-management.spec.ts test file"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Task Creation)
4. Complete Phase 4: User Story 2 (Lane Workflow)
5. **STOP and VALIDATE**: Run `npx playwright test task-entry.spec.ts lane-workflow.spec.ts`
6. Core happy path is verified - can deploy with confidence

### Incremental Delivery

1. Setup + Foundational → Test infrastructure ready
2. Add US1 + US2 → Happy path verified → **MVP!**
3. Add US3 → Error handling verified
4. Add US4 → Navigation verified
5. Add US5 → Todo management verified
6. Add US6 + Edge Cases → Performance and boundaries verified
7. Polish → CI/CD integration complete

### Parallel Team Strategy

With multiple developers after Foundational complete:

- Developer A: US1 (Task Creation) + US2 (Lane Workflow)
- Developer B: US3 (Error Handling) + US4 (Navigation)
- Developer C: US5 (Todo Management) + US6 (Performance)
- All: Edge Cases + Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently runnable via `npx playwright test <file>.spec.ts`
- Existing tests (task-entry.spec.ts, lane-workflow.spec.ts, etc.) need refactoring to use Page Objects
- New tests (navigation.spec.ts, todo-management.spec.ts, edge-cases.spec.ts) created from scratch
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
