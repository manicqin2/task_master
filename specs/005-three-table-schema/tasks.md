# Tasks: Three-Table Schema Architecture

**Input**: Design documents from `/specs/005-three-table-schema/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, architecture.md

**Organization**: Tasks are organized by user story to enable independent implementation and testing following TDD Red-Green-Refactor cycle.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a web application with backend only changes:
- Backend code: `backend/src/`
- Backend tests: `backend/tests/`
- Database migrations: `backend/alembic/versions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and model preparation

- [X] T001 Create new enum types in backend/src/models/enums.py (EnrichmentStatus, TodoStatus)
- [X] T002 [P] Create Workbench model stub in backend/src/models/workbench.py
- [X] T003 [P] Create Todo model stub in backend/src/models/todos.py
- [X] T004 Update backend/src/models/__init__.py to export Workbench and Todo models

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create test fixtures for sample task data in backend/tests/conftest.py
- [X] T006 [P] Create test utilities for database setup/teardown in backend/tests/conftest.py
- [X] T007 [P] Create baseline record count capture utilities in backend/tests/conftest.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Seamless Data Migration (Priority: P1) 🎯 MVP

**Goal**: Migrate all existing task data from single table to three-table structure without data loss

**Independent Test**: Run migration on test database with 1000 sample tasks, verify all records correctly distributed, validate API responses unchanged

### Tests for User Story 1 (TDD Red Phase) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Contract test for migration data integrity in backend/tests/integration/test_migration.py
- [X] T009 [P] [US1] Contract test for enum value validation in backend/tests/integration/test_migration.py
- [X] T010 [P] [US1] Contract test for foreign key validation in backend/tests/integration/test_migration.py
- [X] T011 [P] [US1] Integration test for tasks with only enrichment_status migration in backend/tests/integration/test_migration.py
- [X] T012 [P] [US1] Integration test for tasks with only status migration in backend/tests/integration/test_migration.py
- [X] T013 [P] [US1] Integration test for tasks with both states migration in backend/tests/integration/test_migration.py
- [X] T014 [P] [US1] Integration test for moved_to_todos_at timestamp logic in backend/tests/integration/test_migration.py
- [X] T015 [P] [US1] Integration test for position assignment based on created_at in backend/tests/integration/test_migration.py
- [X] T016 [P] [US1] Contract test for API backward compatibility GET /api/tasks in backend/tests/contract/test_three_table_api.py
- [X] T017 [P] [US1] Contract test for API backward compatibility GET /api/tasks/{id} in backend/tests/contract/test_three_table_api.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation for User Story 1 (TDD Green Phase)

- [X] T018 [US1] Implement complete Workbench model with relationships in backend/src/models/workbench.py
- [X] T019 [US1] Implement complete Todo model with relationships in backend/src/models/todos.py
- [X] T020 [US1] Update Task model with workbench and todo relationships in backend/src/models/task.py
- [X] T021 [US1] Create migration script 005_three_table_schema.py in backend/alembic/versions/
- [X] T022 [US1] Implement pre-migration validation (enum values, foreign keys, baseline counts) in migration script
- [X] T023 [US1] Implement workbench table creation with foreign key in migration script
- [X] T024 [US1] Implement todos table creation with foreign key in migration script
- [X] T025 [US1] Implement data migration to workbench table in migration script
- [X] T026 [US1] Implement data migration to todos table with position assignment in migration script
- [X] T027 [US1] Implement moved_to_todos_at timestamp logic in migration script
- [X] T028 [US1] Implement dropping old columns from tasks table in migration script
- [X] T029 [US1] Implement index creation (task_id, enrichment_status, status, position) in migration script
- [X] T030 [US1] Implement post-migration validation (referential integrity, counts) in migration script
- [X] T031 [US1] Add idempotency check (table existence) to migration script
- [X] T032 [US1] Add downgrade() with NotImplementedError and recovery instructions in migration script

**Checkpoint**: All tests PASSING (Green phase confirmed) - User Story 1 complete and independently testable

---

## Phase 4: User Story 2 - Efficient Task Workbench Queries (Priority: P2)

**Goal**: Task Workbench queries only join tasks + workbench tables for better performance

**Independent Test**: Measure query execution time for lane rendering, verify query plans show no todos table joins

### Tests for User Story 2 (TDD Red Phase) ⚠️

- [X] T033 [P] [US2] Integration test for Pending lane query (tasks + workbench only) in backend/tests/integration/test_workbench_queries.py
- [X] T034 [P] [US2] Integration test for More Info lane query (tasks + workbench only) in backend/tests/integration/test_workbench_queries.py
- [X] T035 [P] [US2] Integration test for Ready lane query (tasks + workbench only) in backend/tests/integration/test_workbench_queries.py
- [X] T036 [P] [US2] Integration test for query performance benchmark (before/after comparison) in backend/tests/integration/test_workbench_queries.py
- [X] T037 [P] [US2] Contract test for GET /api/tasks?enrichment_status=pending in backend/tests/contract/test_three_table_api.py
- [X] T038 [P] [US2] Contract test for GET /api/tasks?enrichment_status=failed in backend/tests/contract/test_three_table_api.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation for User Story 2 (TDD Green Phase)

- [X] T039 [US2] Update TaskService.get_tasks_by_enrichment_status() to join workbench only in backend/src/services/task_service.py
- [X] T040 [US2] Update EnrichmentService queries to use workbench table in backend/src/services/enrichment_service.py
- [X] T041 [US2] Update GET /api/tasks endpoint to support enrichment_status filter with workbench join in backend/src/api/routes/tasks.py
- [X] T042 [US2] Add query optimization comments documenting join strategy in backend/src/services/task_service.py

**Checkpoint**: All tests PASSING (Green phase confirmed) - User Story 2 complete and independently testable

---

## Phase 5: User Story 3 - Independent Todo List Management (Priority: P2)

**Goal**: Todo list operations update only todos table, leaving tasks and workbench unchanged

**Independent Test**: Perform todo operations (complete, reorder), verify via database inspection that only todos table updated

### Tests for User Story 3 (TDD Red Phase) ⚠️

- [X] T043 [P] [US3] Integration test for marking todo complete (todos table only) in backend/tests/integration/test_todo_queries.py
- [X] T044 [P] [US3] Integration test for reordering todos (todos.position only) in backend/tests/integration/test_todo_queries.py
- [X] T045 [P] [US3] Integration test for archiving todo (todos.status only) in backend/tests/integration/test_todo_queries.py
- [X] T046 [P] [US3] Integration test for querying open todos ordered by position in backend/tests/integration/test_todo_queries.py
- [X] T047 [P] [US3] Contract test for PATCH /api/todos/{id} status update in backend/tests/contract/test_three_table_api.py
- [X] T048 [P] [US3] Contract test for PATCH /api/todos/{id} position update in backend/tests/contract/test_three_table_api.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation for User Story 3 (TDD Green Phase)

- [X] T049 [US3] Implement TodoService.get_todos_by_status() joining tasks + todos only in backend/src/services/task_service.py
- [X] T050 [US3] Implement TodoService.update_todo_status() updating todos table only in backend/src/services/task_service.py
- [X] T051 [US3] Implement TodoService.update_todo_position() updating todos table only in backend/src/services/task_service.py
- [X] T052 [US3] Add PATCH /api/todos/{id} endpoint for status/position updates in backend/src/api/routes/tasks.py
- [X] T053 [US3] Verify tasks and workbench tables unchanged during todo operations in backend/src/services/task_service.py

**Checkpoint**: All tests PASSING (Green phase confirmed) - User Story 3 complete and independently testable

---

## Phase 6: User Story 4 - Moving Tasks from Workbench to Todos (Priority: P1)

**Goal**: Moving task from Ready lane to todos creates todos entry and sets moved_to_todos_at timestamp

**Independent Test**: Move task from Ready lane to todos via API, verify todos entry created, moved_to_todos_at set, task appears in todo list

### Tests for User Story 4 (TDD Red Phase) ⚠️

- [X] T054 [P] [US4] Integration test for moving task from Ready to todos in backend/tests/integration/test_workbench_to_todos.py
- [X] T055 [P] [US4] Integration test for moved_to_todos_at timestamp set correctly in backend/tests/integration/test_workbench_to_todos.py
- [X] T056 [P] [US4] Integration test for task disappears from Ready lane after move in backend/tests/integration/test_workbench_to_todos.py
- [X] T057 [P] [US4] Integration test for task appears in todo list with correct position in backend/tests/integration/test_workbench_to_todos.py
- [X] T058 [P] [US4] Contract test for POST /api/tasks/{id}/move-to-todos endpoint in backend/tests/contract/test_three_table_api.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation for User Story 4 (TDD Green Phase)

- [X] T059 [US4] Implement TaskService.move_to_todos() creating todos entry in backend/src/services/task_service.py
- [X] T060 [US4] Implement setting moved_to_todos_at timestamp in workbench in backend/src/services/task_service.py
- [X] T061 [US4] Implement position calculation (bottom of list) in backend/src/services/task_service.py
- [X] T062 [US4] Add POST /api/tasks/{id}/move-to-todos endpoint in backend/src/api/routes/tasks.py
- [X] T063 [US4] Update lane derivation logic to exclude tasks with moved_to_todos_at set in backend/src/services/task_service.py

**Checkpoint**: All tests PASSING (Green phase confirmed) - User Story 4 complete and independently testable

---

## Phase 7: Relationship Testing & Cascade Deletes

**Purpose**: Verify SQLAlchemy relationships and foreign key cascade behavior

### Tests (TDD Red Phase) ⚠️

- [X] T064 [P] Unit test for Task.workbench relationship returns Workbench object in backend/tests/unit/test_models.py
- [X] T065 [P] Unit test for Task.todo relationship returns Todo object in backend/tests/unit/test_models.py
- [X] T066 [P] Integration test for deleting Task cascades to Workbench in backend/tests/integration/test_relationships.py
- [X] T067 [P] Integration test for deleting Task cascades to Todo in backend/tests/integration/test_relationships.py
- [X] T068 [P] Integration test for foreign key constraint prevents orphaned workbench entries in backend/tests/integration/test_relationships.py
- [X] T069 [P] Integration test for unique constraint on workbench.task_id enforces one-to-one in backend/tests/integration/test_relationships.py
- [X] T070 [P] Integration test for unique constraint on todos.task_id enforces one-to-one in backend/tests/integration/test_relationships.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation (TDD Green Phase)

- [X] T071 Verify cascade="all, delete-orphan" in Task.workbench relationship in backend/src/models/task.py
- [X] T072 Verify cascade="all, delete-orphan" in Task.todo relationship in backend/src/models/task.py
- [X] T073 Verify ondelete="CASCADE" in Workbench.task_id foreign key in backend/src/models/workbench.py
- [X] T074 Verify ondelete="CASCADE" in Todo.task_id foreign key in backend/src/models/todos.py
- [X] T075 Update DELETE /api/tasks/{id} endpoint to rely on cascade deletes in backend/src/api/routes/tasks.py

**Checkpoint**: All tests PASSING (Green phase confirmed)

---

## Phase 8: API Backward Compatibility

**Purpose**: Ensure all API endpoints return responses identical to pre-migration format

### Tests (TDD Red Phase) ⚠️

- [X] T076 [P] Contract test for POST /api/tasks creates workbench entry in backend/tests/contract/test_three_table_api.py
- [X] T077 [P] Contract test for PATCH /api/tasks/{id}/metadata updates only tasks table in backend/tests/contract/test_three_table_api.py
- [X] T078 [P] Contract test for DELETE /api/tasks/{id} cascades to workbench and todos in backend/tests/contract/test_three_table_api.py
- [X] T079 [P] Contract test for response format includes enrichment_status from workbench in backend/tests/contract/test_three_table_api.py
- [X] T080 [P] Contract test for response format includes status from todos in backend/tests/contract/test_three_table_api.py

**Checkpoint**: All tests written and FAILING (Red phase confirmed)

### Implementation (TDD Green Phase)

- [X] T081 Update POST /api/tasks to create workbench entry alongside task in backend/src/api/routes/tasks.py
- [X] T082 Update GET /api/tasks to join tables and transform response in backend/src/api/routes/tasks.py
- [X] T083 Update GET /api/tasks/{id} to join tables and include enrichment_status and status in backend/src/api/routes/tasks.py
- [X] T084 Update PATCH /api/tasks/{id}/metadata to update only tasks table in backend/src/api/routes/tasks.py
- [X] T085 Add response transformation utilities for backward compatibility in backend/src/api/routes/tasks.py

**Checkpoint**: All tests PASSING (Green phase confirmed)

---

## Phase 9: Polish & Cross-Cutting Concerns (TDD Refactor Phase)

**Purpose**: Optimize, document, and polish implementation without changing behavior

- [X] T086 [P] Extract migration validation logic into helper functions in backend/alembic/versions/005_three_table_schema.py
- [X] T087 [P] Add detailed logging to migration script for troubleshooting in backend/alembic/versions/005_three_table_schema.py
- [X] T088 [P] Optimize query patterns and verify indexes used correctly in backend/src/services/task_service.py
- [X] T089 [P] Add database query plan analysis for performance verification in backend/tests/integration/test_workbench_queries.py
- [X] T090 [P] Document API transformation logic (joined result → backward-compatible response) in backend/src/api/routes/tasks.py
- [X] T091 [P] Add migration rollback documentation (restore from backup procedure) in backend/alembic/versions/005_three_table_schema.py
- [X] T092 Update CLAUDE.md with new three-table architecture and query patterns in CLAUDE.md
- [X] T093 [P] Document foreign key cascade behavior in backend/src/models/task.py
- [X] T094 [P] Add migration troubleshooting guide in specs/005-three-table-schema/migration-guide.md
- [X] T095 Verify all tests still PASSING after refactoring (Green phase maintained)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 stories first: US1, US4, then P2: US2, US3)
- **Relationship Testing (Phase 7)**: Can run in parallel with User Stories 2-4 after US1 complete
- **API Compatibility (Phase 8)**: Depends on all user stories complete
- **Polish (Phase 9)**: Depends on all previous phases complete

### User Story Dependencies

- **User Story 1 (P1)**: CRITICAL - Must complete first (enables migration)
- **User Story 4 (P1)**: Depends on US1 (needs workbench and todos tables to exist)
- **User Story 2 (P2)**: Depends on US1 (needs workbench table queries)
- **User Story 3 (P2)**: Depends on US1 (needs todos table operations)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Red phase)
- Models before services
- Services before API endpoints
- Core implementation before integration
- All tests PASSING before moving to Refactor phase

### Parallel Opportunities

- Setup tasks T002 and T003 can run in parallel (different model files)
- Foundational tasks T006 and T007 can run in parallel (different test utilities)
- All tests for each user story marked [P] can run in parallel (different test files or test functions)
- User Stories 2 and 3 can be worked on in parallel after US1 completes
- Phase 7 (Relationship Testing) can run in parallel with US2-US4 after US1 completes
- Polish tasks marked [P] can run in parallel (different files)

---

## Parallel Example: User Story 1 - Tests

```bash
# Launch all contract tests for US1 together:
# In separate terminals or parallel execution:
Task T008: "Contract test for migration data integrity"
Task T009: "Contract test for enum value validation"
Task T010: "Contract test for foreign key validation"
Task T011: "Integration test for tasks with only enrichment_status migration"
Task T012: "Integration test for tasks with only status migration"
Task T013: "Integration test for tasks with both states migration"
Task T014: "Integration test for moved_to_todos_at timestamp logic"
Task T015: "Integration test for position assignment based on created_at"
Task T016: "Contract test for API backward compatibility GET /api/tasks"
Task T017: "Contract test for API backward compatibility GET /api/tasks/{id}"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007) - CRITICAL
3. Complete Phase 3: User Story 1 (T008-T032)
   - Write all tests FIRST (Red phase: T008-T017)
   - Implement migration and models (Green phase: T018-T032)
4. **STOP and VALIDATE**: Run migration on test database, verify all tests pass
5. Create database backup, run migration on production (maintenance window)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test migration independently → **DEPLOY (MVP!)**
3. Add User Story 4 → Test workbench-to-todos flow → Deploy
4. Add User Story 2 → Test workbench query optimization → Deploy
5. Add User Story 3 → Test todos operations → Deploy
6. Add Relationship Testing (Phase 7) → Verify cascade deletes
7. Add API Compatibility (Phase 8) → Verify backward compatibility
8. Polish (Phase 9) → Optimize and document

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational + US1 complete:
   - Developer A: User Story 2 (Workbench queries)
   - Developer B: User Story 3 (Todo operations)
   - Developer C: User Story 4 (Move to todos)
   - Developer D: Phase 7 (Relationship testing)
3. Once all user stories complete:
   - Team: Phase 8 (API compatibility validation)
   - Team: Phase 9 (Polish and documentation)

---

## Testing Strategy (TDD Enforcement)

### Red-Green-Refactor Cycle

**Red Phase** (Write failing tests first):
- For each user story, complete ALL test tasks (T008-T017 for US1, etc.)
- Run tests, verify they FAIL (models/endpoints don't exist yet)
- Commit: "Red: Add tests for US1 - migration data integrity (FAILING)"

**Green Phase** (Make tests pass):
- Implement ONLY enough code to make tests pass
- For each implementation task, run tests after completion
- Once all tests pass, commit: "Green: Implement US1 - migration complete (PASSING)"

**Refactor Phase** (Optimize without breaking tests):
- Extract duplicated code, optimize queries, improve readability
- Run tests after each refactor to ensure still PASSING
- Commit: "Refactor: Extract migration validation helpers (PASSING)"

### Test Coverage Requirements

- **Contract Tests**: Verify API responses byte-for-byte identical before/after migration
- **Integration Tests**: Test migration on sample databases with various data states
- **Unit Tests**: Test model relationships (Task ↔ Workbench, Task ↔ Todo)
- **Performance Tests**: Benchmark queries before/after migration

---

## Success Metrics (Mapped to Spec)

**From Success Criteria (spec.md)**:
- SC-001: 100% data migration → Validated by T008 (migration data integrity test)
- SC-002: API responses identical → Validated by T016, T017, T076-T080
- SC-003: Query performance maintained → Validated by T036, T089
- SC-004: Todo operations <100ms → Validated by T046 (todo query performance)
- SC-005: Zero orphaned records → Validated by T030 (post-migration validation), T068
- SC-006: Migration <5 min for 10k tasks → Validated by T008 (migration performance)
- SC-007: Storage efficiency → Validated by T030 (post-migration validation)
- SC-008: Zero regression bugs → Validated by all contract tests (T016, T017, T037, T038, T047, T048, T058, T076-T080)
- SC-009: Task creation workflow 100% → Validated by T076, T081
- SC-010: Workbench archival capability → Validated by T027, T055 (moved_to_todos_at logic)

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **CRITICAL**: Verify tests FAIL before implementing (Red phase)
- **CRITICAL**: Verify tests PASS after implementing (Green phase)
- Commit after each Red-Green-Refactor cycle
- Stop at any checkpoint to validate story independently
- Create database backup before running migration on production
- Migration assumes maintenance window or read-only mode
- No frontend changes required - UI remains identical

---

## Total Task Count

- **Setup (Phase 1)**: 4 tasks
- **Foundational (Phase 2)**: 3 tasks
- **User Story 1 (Phase 3)**: 25 tasks (10 tests + 15 implementation)
- **User Story 2 (Phase 4)**: 10 tasks (6 tests + 4 implementation)
- **User Story 3 (Phase 5)**: 11 tasks (6 tests + 5 implementation)
- **User Story 4 (Phase 6)**: 10 tasks (5 tests + 5 implementation)
- **Relationship Testing (Phase 7)**: 12 tasks (7 tests + 5 implementation)
- **API Compatibility (Phase 8)**: 10 tasks (5 tests + 5 implementation)
- **Polish (Phase 9)**: 10 tasks

**Total**: 95 tasks

**Task Distribution**:
- Tests: 45 tasks (47%)
- Implementation: 40 tasks (42%)
- Polish/Documentation: 10 tasks (11%)

**Parallel Opportunities**: 42 tasks marked [P] (44% can run in parallel)

**Independent Test Criteria**:
- US1: Run migration on test DB, verify record counts, verify API responses
- US2: Measure query time for lanes, verify query plans show workbench-only joins
- US3: Perform todo operations, inspect DB to verify only todos updated
- US4: Move task to todos, verify todos entry + moved_to_todos_at timestamp

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 32 tasks
