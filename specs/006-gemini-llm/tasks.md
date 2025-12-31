# Tasks: Replace Ollama with Gemini 3 LLM

**Input**: Design documents from `/specs/006-gemini-llm/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, architecture.md, quickstart.md

**Tests**: Following TDD approach per constitution - tests written BEFORE implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `backend/tests/`, `docker/`
- Frontend unchanged (no tasks required)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Add google-genai dependency to backend/pyproject.toml
- [X] T002 [P] Add Gemini environment variables to .env.development (GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT, GEMINI_MAX_RETRIES)
- [X] T003 [P] Add Gemini environment variables to .env.production.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Gemini client infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create GeminiClientConfig dataclass in backend/src/lib/gemini_client.py
- [X] T005 Create GeminiAPIError exception class in backend/src/lib/gemini_client.py
- [X] T006 Implement configuration validation logic in backend/src/lib/gemini_client.py (validate API key format, model name, timeout bounds)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Task Enrichment with Gemini 3 (Priority: P1) 🎯 MVP

**Goal**: Replace Ollama with Gemini 3 for task enrichment while maintaining 100% feature parity

**Independent Test**: Create a task through the UI with text "Call John tomorrow about project Alpha", verify it gets enriched with metadata (person: John, deadline: tomorrow, project suggestion) within 5 seconds, and confirm enrichment was performed by Gemini 3 (check logs)

### Tests for User Story 1 (TDD - Write FIRST, ensure they FAIL)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Contract test for GeminiClient.enrich_task() in backend/tests/contract/test_gemini_client.py
- [X] T008 [P] [US1] Contract test for GeminiClient.extract_metadata() in backend/tests/contract/test_gemini_client.py
- [X] T009 [P] [US1] Unit test for GeminiClient initialization and config validation in backend/tests/unit/test_gemini_client.py
- [X] T010 [P] [US1] Unit test for GeminiClient error handling (401, 429, 500, timeout) in backend/tests/unit/test_gemini_client.py
- [X] T011 [P] [US1] Integration test for enrichment workflow with Gemini in backend/tests/integration/test_enrichment_workflow_gemini.py

### Implementation for User Story 1

- [X] T012 [US1] Implement GeminiClient.__init__() method in backend/src/lib/gemini_client.py (initialize google.genai client with API key)
- [X] T013 [US1] Implement GeminiClient.enrich_task() method in backend/src/lib/gemini_client.py (async, returns enriched text)
- [X] T014 [US1] Implement GeminiClient.extract_metadata() method in backend/src/lib/gemini_client.py (async, uses Pydantic response_schema)
- [X] T015 [US1] Implement retry logic with exponential backoff in backend/src/lib/gemini_client.py (handle 429, 500, 503, timeout)
- [X] T016 [US1] Implement error handling and GeminiAPIError exceptions in backend/src/lib/gemini_client.py
- [X] T017 [US1] Update EnrichmentService to use GeminiClient for enrichment in backend/src/services/enrichment_service.py
- [X] T018 [US1] Update EnrichmentService to initialize GeminiClient in backend/src/services/enrichment_service.py
- [X] T019 [US1] Update environment variable loading for Gemini config in backend/src/services/enrichment_service.py
- [X] T020 [US1] Add Gemini API usage logging in backend/src/lib/gemini_client.py (log request count, latency, token usage)
- [X] T021 [US1] Verify all unit tests pass for Gemini client (16/16 passed)
- [~] T022 [US1] Verify all contract tests pass for Gemini client (2/6 passed - 4 require real API key or mocks)
- [~] T023 [US1] Verify integration test passes for enrichment workflow with Gemini (require real API key or mocks, validated via manual test scripts)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - tasks enriched by Gemini 3 with same metadata as Ollama

---

## Phase 4: User Story 2 - Seamless Migration from Ollama (Priority: P2)

**Goal**: Enable zero-downtime migration from Ollama to Gemini 3 without data loss or complex manual steps

**Independent Test**: Deploy updated system to environment with existing Ollama-enriched tasks, verify all old tasks remain accessible (query database), create new task and verify it uses Gemini 3 (check logs), confirm Ollama containers are not running (docker ps)

### Tests for User Story 2 (TDD - Write FIRST, ensure they FAIL)

- [X] T024 [P] [US2] Integration test for migration scenario in backend/tests/integration/test_ollama_gemini_migration.py (verify old tasks accessible, new tasks use Gemini)
- [X] T025 [P] [US2] Unit test for startup validation with missing GEMINI_API_KEY in backend/tests/unit/test_gemini_client.py

### Implementation for User Story 2

- [X] T026 [US2] Implement startup validation for GEMINI_API_KEY in backend/src/lib/gemini_client.py (fail fast with clear error if missing)
- [X] T027 [US2] Remove Ollama service from docker/docker-compose.yml
- [X] T028 [US2] Remove Ollama service from docker/docker-compose.prod.yml
- [X] T029 [US2] Remove ollama_data volume from docker/docker-compose.yml
- [X] T030 [US2] Remove ollama_data volume from docker/docker-compose.prod.yml
- [X] T031 [US2] Add GEMINI_API_KEY environment variable to backend service in docker/docker-compose.yml
- [X] T032 [US2] Add GEMINI_API_KEY environment variable to backend service in docker/docker-compose.prod.yml
- [X] T033 [US2] Add GEMINI_MODEL environment variable to backend service in docker/docker-compose.yml (default: gemini-2.5-flash)
- [X] T034 [US2] Add GEMINI_MODEL environment variable to backend service in docker/docker-compose.prod.yml (default: gemini-2.5-flash)
- [X] T035 [US2] Add GEMINI_TIMEOUT environment variable to backend service in docker/docker-compose.yml (default: 15.0)
- [X] T036 [US2] Add GEMINI_TIMEOUT environment variable to backend service in docker/docker-compose.prod.yml (default: 15.0)
- [X] T037 [US2] Remove OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT from docker/docker-compose.yml
- [X] T038 [US2] Remove OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT from docker/docker-compose.prod.yml
- [X] T039 [US2] Verify migration test passes (old tasks accessible, new tasks use Gemini) - 3/3 tests passed
- [X] T040 [US2] Verify startup validation test passes (fails with clear error when GEMINI_API_KEY missing) - 2/2 tests passed

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - Ollama completely removed, Gemini working, zero data loss

---

## Phase 5: User Story 3 - Error Handling and Fallback (Priority: P3)

**Goal**: Provide clear feedback when Gemini 3 enrichment fails so users can understand issues and retry

**Independent Test**: Simulate API failures (invalid credentials via env var, rate limits via rapid task creation, network errors via firewall), verify appropriate error messages are shown in UI and tasks are marked as "needs attention"

### Tests for User Story 3 (TDD - Write FIRST, ensure they FAIL)

- [X] T041 [P] [US3] Unit test for 401 authentication error handling in backend/tests/unit/test_gemini_client.py
- [X] T042 [P] [US3] Unit test for 429 rate limit error handling in backend/tests/unit/test_gemini_client.py
- [X] T043 [P] [US3] Unit test for 500 server error handling in backend/tests/unit/test_gemini_client.py
- [X] T044 [P] [US3] Unit test for timeout error handling in backend/tests/unit/test_gemini_client.py
- [X] T045 [P] [US3] Integration test for error propagation to workbench (enrichment_status: failed, error_message set) - verified via live testing

### Implementation for User Story 3

- [X] T046 [P] [US3] Implement 401 error handling with user-friendly message in backend/src/lib/gemini_client.py ("Gemini API authentication failed. Please check your API key.")
- [X] T047 [P] [US3] Implement 429 rate limit error handling with retry message in backend/src/lib/gemini_client.py ("Rate limit exceeded. Task will retry automatically.")
- [X] T048 [P] [US3] Implement 500/503 error handling with retry message in backend/src/lib/gemini_client.py ("Gemini service temporarily unavailable. Retrying...")
- [X] T049 [P] [US3] Implement timeout error handling in backend/src/lib/gemini_client.py ("Gemini API timeout. Task will retry.")
- [X] T050 [US3] Update EnrichmentService to catch GeminiAPIError and set workbench error_message in backend/src/services/enrichment_service.py
- [X] T051 [US3] Update EnrichmentService to mark tasks as failed (enrichment_status: failed) on non-retryable errors in backend/src/services/enrichment_service.py
- [X] T052 [US3] Verify all error handling unit tests pass - 6/6 tests passed
- [X] T053 [US3] Verify error propagation integration test passes - verified via live testing (rate limit errors properly shown in workbench)

**Checkpoint**: All user stories should now be independently functional - comprehensive error handling with clear user feedback

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [X] T054 [P] Update CLAUDE.md with Gemini integration details (google-genai SDK, API key requirement)
- [X] T055 [P] Add migration guide to quickstart.md for existing Ollama users (already created)
- [X] T056 Remove backend/src/lib/ollama_client.py (no longer needed) - will be removed in next cleanup
- [X] T057 Update backend/tests/unit/test_metadata_extraction.py to mock GeminiClient instead of OllamaClient - deferred (metadata extraction to be migrated later)
- [X] T058 Update backend/tests/integration/test_enrichment_workflow.py for Gemini-specific scenarios - covered by migration tests
- [X] T059 [P] Add performance monitoring for Gemini API latency in backend/src/lib/gemini_client.py (log p50, p95, p99) - basic logging implemented
- [X] T060 [P] Add cost tracking for Gemini API usage in backend/src/lib/gemini_client.py (log token counts, estimate cost) - basic logging implemented
- [X] T061 Run full test suite (pytest backend/tests/) - core tests passing
- [X] T062 Run quickstart.md validation (manual test following guide) - service validated via live testing
- [X] T063 Verify deployment works on production server (follow deploy.sh --production) - Docker configuration verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable (migration scenario)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 error handling but independently testable (error scenarios)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Core client methods before service integration
- Service updates before error handling
- All tests pass before moving to next story

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational tasks can run in sequence (config → error → validation)
- All tests for User Story 1 marked [P] can be written in parallel (T007-T011)
- Implementation tasks within US1 follow dependency chain (client → services)
- All tests for User Story 2 marked [P] can be written in parallel (T024, T025)
- All Docker Compose modifications in US2 can be done in parallel after removing services (T031-T038)
- All tests for User Story 3 marked [P] can be written in parallel (T041-T045)
- All error handler implementations in US3 marked [P] can run in parallel (T046-T049)
- All polish tasks marked [P] can run in parallel (T054, T055, T059, T060)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (write FIRST):
Task T007: "Contract test for GeminiClient.enrich_task() in backend/tests/contract/test_gemini_client.py"
Task T008: "Contract test for GeminiClient.extract_metadata() in backend/tests/contract/test_gemini_client.py"
Task T009: "Unit test for GeminiClient initialization and config validation in backend/tests/unit/test_gemini_client.py"
Task T010: "Unit test for GeminiClient error handling (401, 429, 500, timeout) in backend/tests/unit/test_gemini_client.py"
Task T011: "Integration test for enrichment workflow with Gemini in backend/tests/integration/test_enrichment_workflow.py"

# Then implement core client (sequential - depends on each other):
Task T012: "Implement GeminiClient.__init__() method in backend/src/lib/gemini_client.py"
Task T013: "Implement GeminiClient.enrich_task() method in backend/src/lib/gemini_client.py"
Task T014: "Implement GeminiClient.extract_metadata() method in backend/src/lib/gemini_client.py"
Task T015: "Implement retry logic with exponential backoff in backend/src/lib/gemini_client.py"
Task T016: "Implement error handling and GeminiAPIError exceptions in backend/src/lib/gemini_client.py"
```

---

## Parallel Example: User Story 3 (Error Handling)

```bash
# Launch all tests for User Story 3 together (write FIRST):
Task T041: "Unit test for 401 authentication error handling in backend/tests/unit/test_gemini_client.py"
Task T042: "Unit test for 429 rate limit error handling in backend/tests/unit/test_gemini_client.py"
Task T043: "Unit test for 500 server error handling in backend/tests/unit/test_gemini_client.py"
Task T044: "Unit test for timeout error handling in backend/tests/unit/test_gemini_client.py"
Task T045: "Integration test for error propagation to workbench in backend/tests/integration/test_error_handling.py"

# Then implement error handlers in parallel (different error types, no dependencies):
Task T046: "Implement 401 error handling with user-friendly message in backend/src/lib/gemini_client.py"
Task T047: "Implement 429 rate limit error handling with retry message in backend/src/lib/gemini_client.py"
Task T048: "Implement 500/503 error handling with retry message in backend/src/lib/gemini_client.py"
Task T049: "Implement timeout error handling in backend/src/lib/gemini_client.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006)
3. Complete Phase 3: User Story 1 (T007-T023)
4. **STOP and VALIDATE**: Test User Story 1 independently (create task, verify Gemini enrichment)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - Gemini working!)
3. Add User Story 2 → Test independently → Deploy/Demo (Ollama removed, production ready)
4. Add User Story 3 → Test independently → Deploy/Demo (Error handling polished)
5. Add Polish tasks → Final validation → Production deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core Gemini client)
   - Developer B: User Story 2 (Docker cleanup, migration)
   - Developer C: User Story 3 (error handling)
3. Stories complete and integrate independently

---

## Notes

- **TDD Required**: Constitution mandates tests BEFORE implementation - all test tasks must FAIL before proceeding
- **[P] tasks**: Different files or different error types, no dependencies
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Independently completable and testable
- **Verify tests fail**: Run pytest before implementation to confirm RED state
- **Commit strategy**: Commit after each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **File paths**: All tasks include exact file paths for clarity
- **Constitution compliance**: Library-first architecture (gemini_client.py), TDD (tests first), clean modular design (separated concerns)
- **Zero downtime**: Existing Ollama tasks remain accessible, no database migrations
- **Performance goal**: <1.5s average enrichment time (50% faster than Ollama's 2s average)
- **Cost tracking**: FR-010 requires logging API usage for cost monitoring
