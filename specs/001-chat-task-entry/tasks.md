# Tasks: Chat-Based Task Entry

**Input**: Design documents from `/specs/001-chat-task-entry/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per TaskMaster constitution (TDD principle). All tests MUST be written and fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Tasks reference files relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Docker configuration for single-command deployment (FR-020, FR-021)

- [X] T001 Create backend/ directory structure: src/{models,services,api,lib}, tests/{contract,integration,unit}
- [X] T002 Create frontend/ directory structure: src/{components,pages,services,lib}, tests/{integration,unit}
- [X] T003 Create docker/ directory for Docker configuration files
- [X] T004 Initialize Python backend: create backend/pyproject.toml with FastAPI, SQLAlchemy 2.0, openai, pytest dependencies
- [X] T005 [P] Initialize TypeScript frontend: create frontend/package.json with React 18, Vite, shadcn/ui, @tanstack/react-query, vitest dependencies
- [X] T006 [P] Configure Python linting: create backend/.flake8, backend/pyproject.toml with mypy config
- [X] T007 [P] Configure TypeScript linting: create frontend/.eslintrc.json, frontend/tsconfig.json with strict mode
- [X] T008 [P] Create docker/backend.Dockerfile for Python 3.11+ with FastAPI
- [X] T009 [P] Create docker/frontend.Dockerfile for Node.js with Vite build
- [X] T010 Create docker/docker-compose.yml orchestrating ollama, backend, frontend services (FR-021, FR-023)
- [X] T011 [P] Create backend/.env.example with OLLAMA_BASE_URL, DATABASE_URL, OLLAMA_MODEL variables
- [X] T012 [P] Create frontend/.env.example with VITE_API_BASE_URL, VITE_POLLING_INTERVAL variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T013 Create backend/src/models/__init__.py and SQLAlchemy Base setup
- [X] T014 Create backend/src/models/task.py with Task model (id, user_input, enriched_text, status, enrichment_status, created_at, updated_at, error_message)
- [X] T015 Create backend/src/models/enums.py with TaskStatus and EnrichmentStatus enums
- [X] T016 Setup SQLite database initialization in backend/src/lib/database.py with async engine and session management
- [X] T017 Create Alembic migrations framework in backend/alembic/ with initial migration for Task table
- [X] T018 [P] Create backend/src/lib/ollama_client.py for OpenAI-compatible Ollama client initialization
- [X] T019 [P] Create backend/src/api/__init__.py and FastAPI app initialization with CORS middleware
- [X] T020 [P] Create backend/src/api/routes/__init__.py for API route registration
- [X] T021 [P] Create backend/src/services/__init__.py for service layer structure
- [X] T022 [P] Create frontend/src/lib/api-client.ts for Axios/fetch wrapper with base URL configuration
- [X] T023 [P] Create frontend/src/lib/types.ts with Task, EnrichmentStatus, TaskStatus TypeScript interfaces matching backend schema
- [X] T024 [P] Install shadcn/ui CLI and initialize with Tailwind CSS config in frontend/
- [X] T025 [P] Add shadcn/ui components: Button, Input, Card, Skeleton, ScrollArea to frontend/src/components/ui/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Task Capture with Async Enrichment (Priority: P1) 🎯 MVP

**Goal**: Users can type informal task descriptions, submit them rapidly without waiting, and see enriched tasks appear in the task list as enrichment completes asynchronously (FR-001 to FR-019)

**Independent Test**: Type "call mom" in chat input, submit. Verify: (1) input clears immediately, (2) loading indicator appears, (3) within 3s, enriched task "Call Mom to discuss weekend plans" appears in task list. Rapidly submit 3 more tasks without waiting - all should process independently.

### Tests for User Story 1 (RED phase - MUST FAIL FIRST) ⚠️

> **CONSTITUTION REQUIREMENT**: Write these tests FIRST, ensure they FAIL before implementation

- [X] T026 [P] [US1] Contract test for POST /api/v1/tasks in backend/tests/contract/test_tasks_api.py (verify 201 response, task schema, enrichment_status=pending)
- [X] T027 [P] [US1] Contract test for GET /api/v1/tasks in backend/tests/contract/test_tasks_api.py (verify 200 response, tasks array, reverse chronological order)
- [X] T028 [P] [US1] Contract test for GET /api/v1/tasks/{id} in backend/tests/contract/test_tasks_api.py (verify 200/404 responses, task schema)
- [X] T029 [P] [US1] Integration test for enrichment workflow in backend/tests/integration/test_enrichment_workflow.py (mock Ollama, verify pending→processing→completed transitions)
- [X] T030 [P] [US1] Integration test for async task submission in backend/tests/integration/test_async_tasks.py (submit 5 tasks rapidly, verify all complete independently)
- [X] T031 [P] [US1] Unit test for EnrichmentService in backend/tests/unit/test_enrichment_service.py (mock Ollama API, test spelling/grammar improvements)
- [X] T032 [P] [US1] Unit test for TaskService CRUD operations in backend/tests/unit/test_task_service.py (create, list, get, update status transitions)
- [ ] T033 [P] [US1] Frontend component test for ChatInput in frontend/tests/unit/ChatInput.test.tsx (verify empty validation, Enter key submission, button disabled when empty per FR-010 clarification)
- [ ] T034 [P] [US1] Frontend component test for TaskList in frontend/tests/unit/TaskList.test.tsx (verify loading state, enriched display, error state per FR-018 clarification)
- [ ] T035 [P] [US1] Frontend integration test for task submission flow in frontend/tests/integration/task-submission.test.ts (submit task, poll for completion, verify UI updates)

**Checkpoint**: All tests written and FAILING - ready for GREEN phase (implementation)

### Implementation for User Story 1 (GREEN phase)

#### Backend Implementation

- [X] T036 [P] [US1] Implement TaskService.create() in backend/src/services/task_service.py (validate user_input, create task with pending status, return task)
- [X] T037 [P] [US1] Implement TaskService.list() in backend/src/services/task_service.py (fetch all open tasks, order by created_at DESC per FR-007)
- [X] T038 [P] [US1] Implement TaskService.get_by_id() in backend/src/services/task_service.py (fetch single task, raise 404 if not found)
- [X] T039 [P] [US1] Implement TaskService.update_enrichment() in backend/src/services/task_service.py (update enriched_text, enrichment_status, error_message)
- [X] T040 [US1] Implement EnrichmentService.enrich_task() in backend/src/services/enrichment_service.py (call Ollama API, handle errors, return enriched text or raise exception)
- [X] T041 [US1] Implement background task worker in backend/src/services/task_queue.py (update status to processing, call EnrichmentService, update to completed/failed, handle FR-018 error cases)
- [X] T042 [US1] Implement POST /api/v1/tasks endpoint in backend/src/api/routes/tasks.py (validate input per FR-010, create task, schedule background enrichment via FastAPI BackgroundTasks, return 201)
- [X] T043 [US1] Implement GET /api/v1/tasks endpoint in backend/src/api/routes/tasks.py (call TaskService.list(), return tasks array with count, 200 response)
- [X] T044 [US1] Implement GET /api/v1/tasks/{task_id} endpoint in backend/src/api/routes/tasks.py (call TaskService.get_by_id(), return task or 404)
- [X] T045 [US1] Add request validation and error handling to tasks routes in backend/src/api/routes/tasks.py (empty input validation, 400 for invalid requests, 500 for server errors)

#### Frontend Implementation

- [X] T046 [P] [US1] Create TaskItem component in frontend/src/components/TaskItem.tsx (display enriched_text or loading skeleton, show error state per FR-018 clarification, use shadcn/ui Card)
- [X] T047 [P] [US1] Create ChatInput component in frontend/src/components/ChatInput.tsx (input field, send button disabled when empty per FR-010, Enter key handler, use shadcn/ui Input and Button)
- [X] T048 [US1] Create TaskList component in frontend/src/components/TaskList.tsx (render array of TaskItem, empty state per FR-012, use shadcn/ui ScrollArea)
- [X] T049 [US1] Implement useTaskPolling hook in frontend/src/services/useTaskPolling.ts (fetch tasks, poll every 500ms when enrichment in progress per polling strategy, stop when all complete)
- [X] T050 [US1] Implement task API client methods in frontend/src/services/api.ts (createTask, listTasks, getTask using api-client wrapper)
- [X] T051 [US1] Create main TaskEntryPage in frontend/src/pages/TaskEntryPage.tsx (integrate ChatInput, TaskList, useTaskPolling, handle submission flow per FR-001 to FR-019)
- [X] T052 [US1] Add error boundary and loading states to TaskEntryPage (handle API failures, show loading skeleton during initial fetch)

**Checkpoint**: Run all US1 tests - they should now PASS (GREEN). User Story 1 is fully functional and testable independently. Can submit tasks, see loading states, enrichment completes asynchronously, tasks persist across refresh (FR-011).

### Refactor Phase for User Story 1

- [ ] T053 [US1] Refactor backend services to use dependency injection pattern for testability
- [ ] T054 [US1] Extract validation logic into reusable validators in backend/src/lib/validators.py
- [ ] T055 [US1] Optimize SQL queries in TaskService with proper indexing and query planning
- [ ] T056 [US1] Refactor frontend components to reduce prop drilling, use React Context if needed
- [ ] T057 [US1] Add comprehensive error logging to enrichment workflow in backend/src/services/task_queue.py

**Checkpoint**: US1 code is clean, maintainable, and follows TDD RED-GREEN-REFACTOR cycle

---

## Phase 4: User Story 2 - View Open Tasks (Priority: P2)

**Goal**: Users can see all open tasks in a list with proper ordering and empty state (enhances US1 but independently testable)

**Independent Test**: With US1 working, create 5 tasks. Verify all 5 appear in reverse chronological order. Delete all tasks (via backend), verify empty state message "No open tasks yet" appears.

**Note**: US2 primarily adds UI polish to US1's TaskList component. Most core functionality already delivered in US1.

### Tests for User Story 2 (RED phase) ⚠️

- [ ] T058 [P] [US2] Frontend component test for TaskList empty state in frontend/tests/unit/TaskList.test.tsx (verify empty state message displays when tasks array empty)
- [ ] T059 [P] [US2] Frontend integration test for task ordering in frontend/tests/integration/task-ordering.test.ts (create 10 tasks with different timestamps, verify newest appears first)

### Implementation for User Story 2 (GREEN phase)

- [ ] T060 [US2] Enhance TaskList component in frontend/src/components/TaskList.tsx to show "No open tasks yet" when empty (FR-012 verification)
- [ ] T061 [US2] Add visual styling to TaskList for better UX (spacing, dividers between tasks, shadcn/ui styling)
- [ ] T062 [US2] Verify reverse chronological ordering in TaskList rendering (already implemented in US1, add visual timestamp display)

**Checkpoint**: US2 tests PASS. Empty state and ordering visually verified. US1 and US2 both work independently.

### Refactor Phase for User Story 2

- [ ] T063 [US2] Extract empty state into reusable EmptyState component in frontend/src/components/EmptyState.tsx

---

## Phase 5: User Story 3 - Chat Message History (Priority: P3)

**Goal**: Users see their original messages in chat history, providing transparency about enrichment (ephemeral, not persisted per spec assumptions)

**Independent Test**: Type 3 different messages in chat. Verify all 3 original messages visible in chat history pane, chronological order (oldest top, newest bottom). Refresh page - chat history clears (ephemeral), but task list persists.

### Tests for User Story 3 (RED phase) ⚠️

- [ ] T064 [P] [US3] Frontend component test for MessageList in frontend/tests/unit/MessageList.test.tsx (verify messages render in chronological order, user messages vs system confirmations)
- [ ] T065 [P] [US3] Frontend integration test for chat history in frontend/tests/integration/chat-history.test.ts (submit 3 tasks, verify chat shows 3 user messages + 3 system confirmations)
- [ ] T066 [P] [US3] Frontend integration test for ephemeral history in frontend/tests/integration/ephemeral-chat.test.ts (submit task, refresh page, verify chat history clears but task list persists)

### Implementation for User Story 3 (GREEN phase)

- [ ] T067 [P] [US3] Create Message TypeScript interface in frontend/src/lib/types.ts (id, content, timestamp, type enum: user_message | system_confirmation)
- [ ] T068 [P] [US3] Create MessageItem component in frontend/src/components/MessageItem.tsx (render user message or system confirmation with styling)
- [ ] T069 [US3] Create MessageList component in frontend/src/components/MessageList.tsx (render array of MessageItem, chronological order oldest→newest, use shadcn/ui ScrollArea)
- [ ] T070 [US3] Add chat history state to TaskEntryPage in frontend/src/pages/TaskEntryPage.tsx (in-memory React state, append on submission, append confirmation on enrichment complete)
- [ ] T071 [US3] Integrate MessageList into TaskEntryPage layout (split view: chat history left/top, task list right/bottom)
- [ ] T072 [US3] Update ChatInput submission handler to append user message to chat history (store original input before clearing)
- [ ] T073 [US3] Update polling callback to append system confirmation messages when enrichment completes

**Checkpoint**: US3 tests PASS. All 3 user stories independently functional. Chat history provides transparency (FR-006 verified).

### Refactor Phase for User Story 3

- [ ] T074 [US3] Extract chat history logic into custom hook useChatHistory in frontend/src/services/useChatHistory.ts
- [ ] T075 [US3] Optimize MessageList rendering with React.memo to prevent unnecessary re-renders

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Deployment readiness, documentation, and performance validation (FR-020 to FR-023, SC-011 to SC-013)

- [ ] T076 [P] Create README.md in repository root with quickstart instructions referencing specs/001-chat-task-entry/quickstart.md
- [ ] T077 [P] Update docker-compose.yml with health checks for ollama, backend, frontend services (<30s startup per SC-012)
- [ ] T078 [P] Add backend startup script in backend/src/main.py (run migrations, start Uvicorn server)
- [ ] T079 [P] Add frontend build optimization in frontend/vite.config.ts (code splitting, tree shaking)
- [ ] T080 Validate docker-compose startup on Linux (test FR-023 cross-platform requirement)
- [ ] T081 Validate docker-compose startup on macOS (test FR-023 cross-platform requirement)
- [ ] T082 Validate docker-compose startup on Windows with WSL2 (test FR-023 cross-platform requirement)
- [ ] T083 [P] Run performance validation: 5 tasks in <10s per SC-008 (load test with locust or manual verification)
- [ ] T084 [P] Run performance validation: <100ms input clear per SC-001 (Chrome DevTools performance profiling)
- [ ] T085 [P] Run performance validation: <3s enrichment per SC-005 (monitor actual Ollama response times)
- [ ] T086 Add backend error logging with structured logging (Python logging module, log enrichment errors, API errors)
- [ ] T087 [P] Add frontend error tracking (console errors, API failures, display user-friendly messages)
- [ ] T088 Security audit: validate CORS configuration in backend for localhost frontend access
- [ ] T089 Security audit: ensure no secrets in docker-compose.yml or .env files (use .env.example patterns)
- [ ] T090 [P] Final code cleanup: remove console.log statements, unused imports, commented code
- [ ] T091 [P] Run all tests across backend and frontend (pytest for backend, vitest for frontend - all must pass)
- [ ] T092 Generate final API documentation from OpenAPI spec in contracts/openapi.yaml (Swagger UI available at /docs)
- [ ] T093 Verify quickstart.md instructions are accurate (manual walkthrough on fresh machine)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: ✅ Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: ✅ Can start after Foundational (Phase 2) - Enhances US1 TaskList but independently testable
- **User Story 3 (P3)**: ✅ Can start after Foundational (Phase 2) - Adds chat history, independent of US1/US2 core functionality

### Within Each User Story (TDD Requirement)

1. **RED**: Write tests FIRST - all tests MUST FAIL initially
2. **GREEN**: Write minimal implementation to make tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

### Parallel Opportunities

- **Phase 1 (Setup)**: T005-T007 (frontend init), T008-T009 (Dockerfiles), T011-T012 (.env files) can run in parallel
- **Phase 2 (Foundation)**: T018-T025 (backend/frontend foundation) can run in parallel after T013-T017 complete
- **Phase 3 (US1)**: T026-T035 (all tests), T036-T039 (backend services), T046-T048 (frontend components) can run in parallel within their categories
- **Phase 4-5 (US2/US3)**: Tests within each story marked [P]
- **Phase 6 (Polish)**: T076-T079 (docs/config), T080-T082 (platform tests), T083-T085 (perf tests), T090-T091 (cleanup) can run in parallel

### Critical Path

1. Setup (T001-T012) → 2. Foundation (T013-T025) → 3. US1 Tests (T026-T035) → 4. US1 Implementation (T036-T052) → 5. US1 Refactor (T053-T057)

At this point, MVP is complete and deployable. US2 and US3 can be added incrementally.

---

## Parallel Example: User Story 1

```bash
# RED Phase - Launch all tests together (they will all fail initially):
Task: "Contract test for POST /api/v1/tasks in backend/tests/contract/test_tasks_api.py"
Task: "Contract test for GET /api/v1/tasks in backend/tests/contract/test_tasks_api.py"
Task: "Contract test for GET /api/v1/tasks/{id} in backend/tests/contract/test_tasks_api.py"
Task: "Integration test for enrichment workflow in backend/tests/integration/test_enrichment_workflow.py"
Task: "Integration test for async task submission in backend/tests/integration/test_async_tasks.py"
Task: "Unit test for EnrichmentService in backend/tests/unit/test_enrichment_service.py"
Task: "Unit test for TaskService CRUD operations in backend/tests/unit/test_task_service.py"
Task: "Frontend component test for ChatInput in frontend/tests/unit/ChatInput.test.tsx"
Task: "Frontend component test for TaskList in frontend/tests/unit/TaskList.test.tsx"
Task: "Frontend integration test for task submission flow in frontend/tests/integration/task-submission.test.ts"

# GREEN Phase - Launch backend services in parallel:
Task: "Implement TaskService.create() in backend/src/services/task_service.py"
Task: "Implement TaskService.list() in backend/src/services/task_service.py"
Task: "Implement TaskService.get_by_id() in backend/src/services/task_service.py"
Task: "Implement TaskService.update_enrichment() in backend/src/services/task_service.py"

# GREEN Phase - Launch frontend components in parallel:
Task: "Create TaskItem component in frontend/src/components/TaskItem.tsx"
Task: "Create ChatInput component in frontend/src/components/ChatInput.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T025) - CRITICAL blocker
3. Complete Phase 3: User Story 1 (T026-T057) - Follow RED-GREEN-REFACTOR
4. **STOP and VALIDATE**: Test User Story 1 independently against acceptance scenarios
5. Deploy/demo MVP if ready

**At this point, you have a working product**: Users can rapidly capture tasks, see async enrichment, tasks persist. This is the core value prop.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (TDD: Red→Green→Refactor) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (TDD: Red→Green→Refactor) → Test independently → Deploy/Demo (Enhanced UX)
4. Add User Story 3 (TDD: Red→Green→Refactor) → Test independently → Deploy/Demo (Full transparency)
5. Complete Polish (Phase 6) → Production ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (blocking)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (critical path, MVP)
   - **Developer B**: User Story 2 (can start in parallel after foundation)
   - **Developer C**: User Story 3 (can start in parallel after foundation)
3. Stories complete and integrate independently
4. Team comes together for Polish phase

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Required**: Constitution mandates Red-Green-Refactor for all code
- **Independent Stories**: Each user story should be independently completable and testable
- **Verify tests fail**: RED phase is critical - never skip failing tests
- **Commit frequently**: After each task or logical group of [P] tasks
- **Stop at any checkpoint**: Validate story independently before proceeding
- **Constitution compliance**: All tasks follow library-first architecture (services are libraries), TDD workflow, clean module boundaries

---

## Task Count Summary

- **Total Tasks**: 93
- **Phase 1 (Setup)**: 12 tasks
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (User Story 1)**: 32 tasks (10 tests, 17 implementation, 5 refactor)
- **Phase 4 (User Story 2)**: 6 tasks (2 tests, 3 implementation, 1 refactor)
- **Phase 5 (User Story 3)**: 12 tasks (3 tests, 7 implementation, 2 refactor)
- **Phase 6 (Polish)**: 18 tasks

**Parallelizable Tasks**: 41 tasks marked [P]

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 57 tasks = Complete working product

**Tests**: 25 test tasks (RED phase) ensure TDD compliance before implementation
