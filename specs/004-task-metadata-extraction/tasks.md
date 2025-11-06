# Tasks: Task Metadata Extraction

**Input**: Design documents from `/specs/004-task-metadata-extraction/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/metadata-extraction.yaml

**Tests**: Following TDD workflow per constitution - tests written FIRST, must FAIL before implementation

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Web app structure:
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 [P] Add python-dateutil>=2.9.0 to backend/pyproject.toml dependencies
- [X] T002 [P] ~~Add redis>=5.0.0 to backend/pyproject.toml dependencies~~ SKIPPED - Redis deferred to RAG feature
- [X] T003 [P] ~~Configure Redis service in docker-compose.yml with port 6379~~ SKIPPED - Redis deferred to RAG feature
- [X] T004 [P] Add metadata types to frontend/src/types/metadata.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Alembic migration file backend/alembic/versions/004_add_task_metadata.py
- [ ] T006 Add metadata columns to tasks table in migration (project, persons, task_type, priority, deadline_text, deadline_parsed, effort_estimate, dependencies, tags, metadata_suggestions, extracted_at, requires_attention)
- [ ] T007 Create indexes in migration (idx_task_project, idx_task_deadline_parsed, idx_task_requires_attention, idx_task_priority)
- [ ] T008 [P] Extend Task model in backend/src/models/task.py with metadata fields from data-model.md
- [ ] T009 [P] Create Pydantic schemas in backend/src/models/task_metadata.py (TaskMetadata, MetadataExtractionResponse, TaskType, Priority enums)
- [ ] T010 [P] Implement date parser utilities in backend/src/lib/metadata_parsers.py (parse_deadline function with relative date handling using python-dateutil)
- [ ] T011 Run migration and verify schema changes with docker compose exec backend alembic upgrade head

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Metadata Extraction (Priority: P1) 🎯 MVP

**Goal**: Extract structured metadata from task descriptions automatically using LLM with confidence-based auto-population

**Independent Test**: Submit task "Call Sarah tomorrow about ProjectX - urgent" → verify card displays persons=[Sarah], project=[ProjectX], deadline=[tomorrow], type=[call], priority=[urgent]

### Tests for User Story 1 (TDD - Write FIRST, ensure FAIL)

- [ ] T012 [P] [US1] Write contract test for POST /api/tasks with metadata extraction in backend/tests/contract/test_metadata_api.py
- [ ] T013 [P] [US1] Write contract test for GET /api/tasks/{id} with metadata response in backend/tests/contract/test_metadata_api.py
- [ ] T014 [P] [US1] Write unit test for MetadataExtractor.extract() in backend/tests/unit/test_metadata_extraction.py
- [ ] T015 [P] [US1] Write unit test for parse_deadline() with relative dates in backend/tests/unit/test_metadata_parsers.py
- [ ] T016 [P] [US1] Write unit test for confidence threshold logic in backend/tests/unit/test_metadata_extraction.py
- [ ] T017 [P] [US1] Write integration test for full extraction pipeline in backend/tests/integration/test_metadata_enrichment.py

### Implementation for User Story 1

- [ ] T018 [US1] Implement MetadataExtractor service in backend/src/services/metadata_extraction.py with LLM Structured Outputs
- [ ] T019 [US1] Implement LLM prompt for metadata extraction with Pydantic schema in backend/src/services/metadata_extraction.py
- [ ] T020 [US1] ~~Implement Redis caching layer in backend/src/services/metadata_extraction.py~~ SKIPPED - Redis deferred to RAG feature
- [ ] T021 [US1] Implement confidence threshold filtering (0.7) in backend/src/services/metadata_extraction.py
- [ ] T022 [US1] Extend EnrichmentService in backend/src/api/tasks.py to queue metadata extraction as BackgroundTask
- [ ] T023 [US1] Update POST /api/tasks endpoint to trigger metadata extraction in backend/src/api/tasks.py
- [ ] T024 [US1] Update GET /api/tasks/{id} endpoint to include metadata in response in backend/src/api/tasks.py
- [ ] T025 [US1] Implement async metadata extraction handler with timeout (5s) in backend/src/services/enrichment.py
- [ ] T026 [US1] Run contract and unit tests - verify all pass with docker compose exec backend pytest

**Checkpoint**: At this point, backend extracts metadata and returns it in GET /api/tasks/{id}

### Frontend for User Story 1

- [ ] T027 [P] [US1] Write unit test for useTaskMetadata hook in frontend/tests/unit/useTaskMetadata.test.ts
- [ ] T028 [P] [US1] Write component test for MetadataBadges in frontend/tests/unit/TaskCard.test.tsx
- [ ] T029 [P] [US1] Create useTaskMetadata hook in frontend/src/hooks/useTaskMetadata.ts (TanStack Query)
- [ ] T030 [P] [US1] Create MetadataBadges component in frontend/src/components/TaskCard/MetadataBadges.tsx (project, type badges)
- [ ] T031 [P] [US1] Create PersonAvatars component in frontend/src/components/TaskCard/PersonAvatars.tsx
- [ ] T032 [P] [US1] Create DeadlineIndicator component in frontend/src/components/TaskCard/DeadlineIndicator.tsx
- [ ] T033 [US1] Extend TaskCard to display metadata using MetadataBadges, PersonAvatars, DeadlineIndicator in frontend/src/components/LaneWorkflow/TaskCard.tsx
- [ ] T034 [US1] Update API client to fetch metadata in frontend/src/services/api.ts
- [ ] T035 [US1] Run frontend tests with npm test

**Checkpoint**: User Story 1 complete - metadata extracted and displayed on task cards

---

## Phase 4: User Story 4 - Rich Metadata Display (Priority: P2)

**Goal**: Enhance visual display of metadata with color-coded badges, priority flags, and placeholder states

**Independent Test**: View lane with multiple tasks → verify same project shows matching colored badges, high priority shows red flag, empty fields show placeholders

### Tests for User Story 4 (TDD - Write FIRST)

- [ ] T036 [P] [US4] Write component test for priority flag display in frontend/tests/unit/TaskCard.test.tsx
- [ ] T037 [P] [US4] Write component test for color-coded project badges in frontend/tests/unit/TaskCard.test.tsx
- [ ] T038 [P] [US4] Write component test for placeholder states in frontend/tests/unit/TaskCard.test.tsx

### Implementation for User Story 4

- [ ] T039 [P] [US4] Implement priority flag icons in frontend/src/components/TaskCard/MetadataBadges.tsx (high=red, urgent=red-flash)
- [ ] T040 [P] [US4] Implement color-coding for project badges in frontend/src/components/TaskCard/MetadataBadges.tsx (hash-based color assignment)
- [ ] T041 [P] [US4] Add placeholder states for empty metadata fields in frontend/src/components/TaskCard/MetadataBadges.tsx ("No deadline", "No project" in gray)
- [ ] T042 [US4] Add Framer Motion animations (<300ms) for metadata updates in frontend/src/components/TaskCard/MetadataBadges.tsx
- [ ] T043 [US4] Run visual regression tests with npm test

**Checkpoint**: User Story 4 complete - rich metadata display with colors, icons, placeholders

---

## Phase 5: User Story 2 - Incomplete Metadata Handling (Priority: P2)

**Goal**: Route tasks with low-confidence metadata to "Need Attention" lane with suggested values and user confirmation UI

**Independent Test**: Submit task "Send report" → verify appears in Need Attention lane → confirm suggested values → verify moves to appropriate lane

### Tests for User Story 2 (TDD - Write FIRST)

- [ ] T044 [P] [US2] Write contract test for PATCH /api/tasks/{id}/metadata in backend/tests/contract/test_metadata_api.py
- [ ] T045 [P] [US2] Write unit test for requires_attention flag logic in backend/tests/unit/test_metadata_extraction.py
- [ ] T046 [P] [US2] Write component test for FieldPrompt in frontend/tests/unit/NeedAttention.test.tsx
- [ ] T047 [P] [US2] Write component test for SuggestedValues in frontend/tests/unit/NeedAttention.test.tsx
- [ ] T048 [P] [US2] Write E2E test for full Need Attention workflow in frontend/tests/e2e/metadata-workflow.spec.ts

### Implementation for User Story 2

- [ ] T049 [US2] Implement PATCH /api/tasks/{id}/metadata endpoint in backend/src/api/tasks.py (update metadata, set requires_attention=false)
- [ ] T050 [US2] Implement metadata update validation in backend/src/api/tasks.py
- [ ] T051 [P] [US2] Create useMetadataUpdate hook in frontend/src/hooks/useMetadataUpdate.ts (TanStack Query mutation)
- [ ] T052 [P] [US2] Create FieldPrompt component in frontend/src/components/NeedAttention/FieldPrompt.tsx (input for missing fields)
- [ ] T053 [P] [US2] Create SuggestedValues component in frontend/src/components/NeedAttention/SuggestedValues.tsx (dropdown with confidence scores)
- [ ] T054 [US2] Extend LaneWorkflow to filter requires_attention=true tasks to Need Attention lane in frontend/src/components/LaneWorkflow/LaneWorkflow.tsx
- [ ] T055 [US2] Create NeedAttentionCard component in frontend/src/components/NeedAttention/NeedAttentionCard.tsx (displays FieldPrompt + SuggestedValues)
- [ ] T056 [US2] Implement user confirmation flow (accept/edit/reject) in frontend/src/components/NeedAttention/NeedAttentionCard.tsx
- [ ] T057 [US2] Run E2E tests with npm run test:e2e

**Checkpoint**: User Story 2 complete - incomplete metadata routed to Need Attention lane with user confirmation UI

---

## Phase 6: User Story 3 - Debug Visibility with Chain of Thought (Priority: P3)

**Goal**: Provide expandable debug panel showing LLM reasoning process, confidence scores, and alternatives

**Independent Test**: Enable debug mode → click "Show Debug Info" on task card → verify chain of thought displays with confidence scores and alternatives

### Tests for User Story 3 (TDD - Write FIRST)

- [ ] T058 [P] [US3] Write contract test for GET /api/tasks/{id}/metadata/debug in backend/tests/contract/test_metadata_api.py
- [ ] T059 [P] [US3] Write component test for DebugPanel in frontend/tests/unit/DebugPanel.test.tsx
- [ ] T060 [P] [US3] Write integration test for debug mode toggle in frontend/tests/integration/metadata-display.test.tsx

### Implementation for User Story 3

- [ ] T061 [US3] Implement GET /api/tasks/{id}/metadata/debug endpoint in backend/src/api/tasks.py (return chain_of_thought from metadata_suggestions)
- [ ] T062 [US3] Add debug mode access control (admin or debug flag) in backend/src/api/tasks.py
- [ ] T063 [P] [US3] Create DebugPanel component in frontend/src/components/TaskCard/DebugPanel.tsx (expandable section)
- [ ] T064 [US3] Implement chain of thought display in frontend/src/components/TaskCard/DebugPanel.tsx (per-field reasoning + confidence + alternatives)
- [ ] T065 [US3] Add "Show Debug Info" button to TaskCard in frontend/src/components/LaneWorkflow/TaskCard.tsx
- [ ] T066 [US3] Implement debug mode toggle in frontend settings/env in frontend/src/lib/config.ts
- [ ] T067 [US3] Run integration tests with npm test

**Checkpoint**: User Story 3 complete - debug panel shows chain of thought for transparency

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T068 [P] Add error handling for LLM timeout in backend/src/services/metadata_extraction.py
- [ ] T069 [P] Add error handling for Redis connection failure in backend/src/services/metadata_extraction.py
- [ ] T070 [P] Implement graceful degradation (task created even if extraction fails) in backend/src/services/enrichment.py
- [ ] T071 [P] Add logging for extraction performance metrics in backend/src/services/metadata_extraction.py
- [ ] T072 [P] Add loading states for metadata in frontend/src/components/TaskCard/MetadataBadges.tsx
- [ ] T073 [P] Add error states for failed extraction in frontend/src/components/TaskCard/MetadataBadges.tsx
- [ ] T074 [P] Optimize Framer Motion animations for performance in frontend/src/components/TaskCard/
- [ ] T075 [P] Add accessibility labels to metadata components in frontend/src/components/TaskCard/
- [ ] T076 Verify performance goals (<2s extraction, <300ms render) with backend/tests/performance/
- [ ] T077 Run full test suite (backend: pytest, frontend: npm test, E2E: npm run test:e2e)
- [ ] T078 Update CLAUDE.md with manual additions for feature if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ INDEPENDENT
- **User Story 4 (P2)**: Can start after US1 backend complete (needs metadata available) - Extends visual display
- **User Story 2 (P2)**: Can start after US1 complete (needs metadata extraction working) - Adds Need Attention flow
- **User Story 3 (P3)**: Can start after US1 complete (needs metadata_suggestions available) - Adds debug panel ✅ INDEPENDENT (parallel with US2/US4)

### Within Each User Story

- Tests (TDD) MUST be written FIRST and FAIL before implementation
- Backend models before services
- Backend services before API endpoints
- Frontend types before components
- Frontend hooks before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks [P] can run in parallel
- T001, T002, T003, T004 (4 parallel tasks)

**Phase 2 (Foundational)**: T008, T009, T010 can run in parallel (3 parallel tasks)

**Phase 3 (User Story 1)**:
- Tests: T012-T017 can run in parallel (6 parallel tests)
- Frontend: T027-T032 can run in parallel after backend complete (6 parallel tasks)

**Phase 4 (User Story 4)**:
- Tests: T036-T038 can run in parallel (3 parallel tests)
- Implementation: T039-T041 can run in parallel (3 parallel tasks)

**Phase 5 (User Story 2)**:
- Tests: T044-T048 can run in parallel (5 parallel tests)
- Components: T051-T053 can run in parallel (3 parallel tasks)

**Phase 6 (User Story 3)**:
- Tests: T058-T060 can run in parallel (3 parallel tests)
- T063 can run in parallel with T061-T062

**Phase 7 (Polish)**: T068-T075 can run in parallel (8 parallel tasks)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - write tests first):
Task: "Write contract test for POST /api/tasks with metadata extraction in backend/tests/contract/test_metadata_api.py"
Task: "Write contract test for GET /api/tasks/{id} with metadata response in backend/tests/contract/test_metadata_api.py"
Task: "Write unit test for MetadataExtractor.extract() in backend/tests/unit/test_metadata_extraction.py"
Task: "Write unit test for parse_deadline() with relative dates in backend/tests/unit/test_metadata_parsers.py"
Task: "Write unit test for confidence threshold logic in backend/tests/unit/test_metadata_extraction.py"
Task: "Write integration test for full extraction pipeline in backend/tests/integration/test_metadata_enrichment.py"

# After tests FAIL, launch frontend component development in parallel:
Task: "Create useTaskMetadata hook in frontend/src/hooks/useTaskMetadata.ts (TanStack Query)"
Task: "Create MetadataBadges component in frontend/src/components/TaskCard/MetadataBadges.tsx (project, type badges)"
Task: "Create PersonAvatars component in frontend/src/components/TaskCard/PersonAvatars.tsx"
Task: "Create DeadlineIndicator component in frontend/src/components/TaskCard/DeadlineIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (4 parallel tasks)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories, ~8 tasks)
3. Complete Phase 3: User Story 1 (~24 tasks: 6 tests + 18 implementation)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Submit task → verify metadata extracted and displayed
   - Verify <2s extraction time
   - Verify confidence thresholds working
5. Deploy/demo MVP

**MVP Scope**: 36 total tasks (Setup + Foundational + US1)
**Estimated MVP Effort**: ~3-4 days for one developer (with parallel test/impl)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (~12 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! +24 tasks)
3. Add User Story 4 → Enhanced visuals → Deploy/Demo (+7 tasks)
4. Add User Story 2 → Need Attention flow → Deploy/Demo (+9 tasks)
5. Add User Story 3 → Debug panel → Deploy/Demo (+7 tasks)
6. Polish → Production-ready (+11 tasks)

**Full Feature Scope**: 78 total tasks

### Parallel Team Strategy

With 3 developers after Foundational phase:

1. Team completes Setup + Foundational together (~12 tasks, 1 day)
2. Once Foundational done:
   - **Developer A**: User Story 1 (P1) - Core extraction (~24 tasks, 2 days)
   - **Developer B**: Waits for US1 backend, then User Story 4 (P2) - Rich display (~7 tasks, 1 day)
   - **Developer C**: Waits for US1, then User Story 3 (P3) - Debug panel (~7 tasks, 1 day in parallel with US2)
3. After US1 + US4 + US3:
   - **Developer B**: User Story 2 (P2) - Need Attention (~9 tasks, 1.5 days)
4. All: Polish together (~11 tasks, 0.5 days)

**Parallel Timeline**: ~4-5 days vs ~10 days sequential

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [US#] label maps task to specific user story for traceability
- Each user story independently completable and testable (verified via checkpoints)
- TDD workflow enforced: Tests written FIRST, must FAIL before implementation
- Verify tests fail before implementing (Red-Green-Refactor cycle)
- Commit after each task or logical group
- Stop at checkpoints to validate story independently
- Constitution compliance: Library-first (metadata_extraction.py), TDD (tests first), Clean architecture (service layer separation)
- Performance targets: <2s extraction (95th percentile), <300ms frontend render
- Confidence threshold: 0.7 for auto-population, 0.4-0.69 for suggestions
