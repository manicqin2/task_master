# Implementation Plan: Three-Table Schema Architecture

**Branch**: `005-three-table-schema` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-three-table-schema/spec.md`

## Summary

Refactor the database from a single monolithic `tasks` table into three specialized tables (`tasks`, `workbench`, `todos`) that separate concerns by lifecycle and responsibility. This architectural improvement enables:
- **Clean separation**: Immutable task data (tasks) vs enrichment workflow state (workbench) vs execution workflow state (todos)
- **Query efficiency**: Task Workbench queries only workbench table, todo list queries only todos table
- **Data lifecycle clarity**: Each table has distinct create/update/archive lifecycle
- **Future flexibility**: Enable archival strategies and multiple execution views

The migration must be zero-downtime from user perspective, maintain 100% backward compatibility for API responses, and complete successfully for databases with thousands of existing tasks.

## Technical Context

**Language/Version**: Python 3.11+ (backend matches existing project)
**Primary Dependencies**:
- SQLAlchemy 2.0 (async ORM, already in use)
- Alembic 1.12+ (database migrations, already in use)
- aiosqlite 0.19+ (async SQLite driver, already in use)
- FastAPI 0.104+ (API framework, already in use)

**Storage**: SQLite with foreign key support enabled (existing database)
**Testing**: pytest + pytest-asyncio (existing test framework)
**Target Platform**: Web application (Docker containerized Linux server)
**Project Type**: Web (backend + frontend structure)

**Performance Goals**:
- Migration completes within 5 minutes for 10,000 tasks (SC-006)
- Task Workbench queries execute in ≤ previous single-table query time (SC-003)
- Todo operations complete in <100ms for 1000 tasks (SC-004)
- Zero data loss during migration (SC-001)

**Constraints**:
- MUST maintain backward compatibility - API responses unchanged (FR-012, SC-002)
- MUST enforce referential integrity via foreign keys (FR-005, FR-006, FR-007)
- MUST support rollback to single-table schema via database backup (not automated downgrade)
- Migration assumes maintenance window or read-only mode (prevents concurrent write conflicts)
- MUST NOT introduce new user-facing features (purely internal refactoring)

**Scale/Scope**:
- Migrate all existing tasks (tested up to 10,000 tasks)
- 3 new database tables (tasks refactored, workbench new, todos new)
- Update 3 SQLAlchemy models (Task, new Workbench, new Todo)
- Modify existing API endpoints to join tables when responding (backward compat)
- NO frontend changes required (UI remains identical)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Library-First Architecture ✅ PASS

**Status**: N/A - Database schema refactoring, not library development

**Analysis**: This feature refactors database schema and models, which are infrastructure concerns rather than standalone libraries. The refactored models (Task, Workbench, Todo) will be used by existing services but are not independently distributable libraries.

**Justification**: Database models and migrations are foundational infrastructure that support library-level services (e.g., TaskService, EnrichmentService remain libraries that use these models).

### II. Test-Driven Development (NON-NEGOTIABLE) ✅ PASS

**Status**: COMPLIANT - Strict TDD required for all implementation

**Plan**:
- Phase 2: Write migration tests FIRST (Red) - verify migration logic on test database
- Phase 2: Write model relationship tests FIRST (Red) - verify foreign keys, cascade deletes
- Phase 2: Write API backward compatibility tests FIRST (Red) - verify responses unchanged
- Phase 3: Implement migration script (Green)
- Phase 3: Implement model updates (Green)
- Phase 3: Update API joins (Green)
- Phase 4: Refactor for clarity

**Enforcement**: All tasks in tasks.md will follow Red-Green-Refactor cycle explicitly. Contract tests written before any model changes, integration tests before service updates.

### III. Clean Modular Architecture ✅ PASS

**Status**: COMPLIANT - Clear separation of concerns maintained

**Architecture**:
- **Data Layer** (models/): Task, Workbench, Todo models with explicit relationships
- **Migration Layer** (alembic/): Standalone migration script, idempotent, transactional
- **Service Layer** (services/): Existing TaskService, EnrichmentService updated to use new joins
- **API Layer** (api/): Endpoints updated to join tables, no business logic changes

**Separation Verified**:
- Models define structure only (no business logic)
- Services orchestrate domain operations (no direct SQL)
- API handles HTTP concerns (delegates to services)
- Migration is isolated in Alembic (no runtime dependency on application code)

### IV. Visual Documentation Standards ✅ PASS

**Status**: COMPLIANT - Architecture diagrams required for Data/Storage feature

**Required Diagrams** (per constitution - Data/Storage Features):
1. ✅ Entity Relationship Diagram (ERD) - three-table schema with foreign keys
2. ✅ Data flow diagram - migration process flow
3. ✅ Migration/versioning flow - step-by-step migration sequence
4. ✅ Query optimization diagrams - before/after query patterns

**Deliverable**: `architecture.md` with Mermaid diagrams showing:
- Three-table ERD with relationships
- Migration state machine (single-table → three-table)
- Query separation (workbench queries vs todos queries)
- Rollback strategy (backup restore flow)

**Post-Design Re-Check**: ✅ All diagrams included in architecture.md (Phase 1 output)

## Project Structure

### Documentation (this feature)

```text
specs/005-three-table-schema/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (migration strategy decisions)
├── data-model.md        # Phase 1 output (three-table schema definition)
├── architecture.md      # Phase 1 output (ERD + migration diagrams)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── alembic/
│   └── versions/
│       ├── 001_initial_task_table.py          # Existing (Feature 001)
│       ├── 004_add_task_metadata.py           # Existing (Feature 004)
│       └── 005_three_table_schema.py          # NEW (this feature - migration script)
├── src/
│   ├── models/
│   │   ├── __init__.py                        # Updated (export Workbench, Todo)
│   │   ├── task.py                            # MODIFIED (remove status, enrichment_status, add relationships)
│   │   ├── workbench.py                       # NEW (enrichment workflow state)
│   │   ├── todos.py                           # NEW (execution workflow state)
│   │   └── enums.py                           # MODIFIED (add EnrichmentStatus, TodoStatus enums)
│   ├── services/
│   │   ├── task_service.py                    # MODIFIED (update queries to join tables)
│   │   └── enrichment_service.py              # MODIFIED (update to use workbench table)
│   ├── api/
│   │   └── routes/
│   │       └── tasks.py                       # MODIFIED (join tables for responses, maintain backward compat)
│   └── lib/
│       └── database.py                        # NO CHANGES (connection management)
└── tests/
    ├── contract/
    │   └── test_three_table_api.py            # NEW (verify API backward compatibility)
    ├── integration/
    │   ├── test_migration.py                  # NEW (test migration on sample data)
    │   └── test_relationships.py              # NEW (test foreign keys, cascade deletes)
    └── unit/
        └── test_models.py                     # MODIFIED (add tests for new models)

frontend/
└── [NO CHANGES - UI remains identical, only backend data source changes]
```

**Structure Decision**: Web application structure (backend + frontend). Only backend changes required for this database refactoring. Frontend continues to use existing API endpoints which now join the three tables internally but return identical response structures.

## Complexity Tracking

> **This section documents any constitutional violations that require justification.**

**Status**: ✅ NO VIOLATIONS - Full constitutional compliance

This feature adheres to all constitutional principles:
- TDD enforced throughout (tests written first for migration, models, API compat)
- Clean architecture maintained (clear separation between models, services, API)
- Visual documentation provided (ERD + migration flow diagrams)
- No library-first concerns (infrastructure refactoring)

**No justifications required.**

## Implementation Strategy

### Migration Approach

**Selected Strategy**: Transactional migration with pre-migration validation

**Rationale**:
- SQLite supports transactions - entire migration can be atomic (all-or-nothing)
- Pre-migration validation catches issues before any changes committed
- Rollback via database backup if needed (simpler than automated downgrade)
- Maintenance window acceptable (read-only mode during migration)

**Alternatives Considered**:
- ❌ **Zero-downtime blue-green migration**: Rejected - requires dual-write complexity, out of scope per spec
- ❌ **Gradual column migration**: Rejected - too complex to maintain both schemas simultaneously
- ✅ **Atomic transactional migration**: Chosen - simplest, safest for SQLite

### Backward Compatibility Strategy

**API Response Transformation**:
- API endpoints will join `tasks` + `workbench` + `todos` tables
- Transform joined result back to previous single-table response format
- Response includes `enrichment_status` (from workbench) and `status` (from todos) as before
- Frontend sees no changes - continues to work with existing response structure

**Query Optimization**:
- Task Workbench queries: JOIN tasks + workbench (no todos)
- Todo list queries: JOIN tasks + todos (no workbench)
- Individual task queries: LEFT JOIN all three (handle tasks with no workbench/todos entry)

### Testing Strategy

**Test Levels** (per constitution TDD requirement):
1. **Contract Tests** (FIRST):
   - Test API responses before/after migration are byte-for-byte identical
   - Test all endpoints with sample data in both schemas

2. **Integration Tests** (SECOND):
   - Test migration script on databases with various data states
   - Test foreign key constraints and cascade deletes
   - Test query performance before/after

3. **Unit Tests** (THIRD):
   - Test model relationships (Task ↔ Workbench, Task ↔ Todo)
   - Test enum values (EnrichmentStatus, TodoStatus)

**Test Data Strategy**:
- Create sample databases with edge cases:
  - Tasks with only enrichment_status (no status) → workbench entry only
  - Tasks with only status (no enrichment_status) → todos entry only
  - Tasks with both → both workbench and todos entries
  - Tasks being enriched (pending/processing) → workbench only
  - Completed tasks in todo list → both tables

## Phases

### Phase 0: Research & Decision Documentation

**Objective**: Document all technical decisions for migration strategy, foreign key handling, and rollback approach.

**Deliverable**: `research.md`

**Key Decisions**:
1. **Migration Atomicity**: Use SQLite transactions for all-or-nothing migration
2. **Foreign Key Enforcement**: Enable pragma foreign_keys=ON, use CASCADE DELETE
3. **Position Initialization**: Assign sequential positions (1, 2, 3...) to existing todos based on created_at
4. **Moved_to_todos_at Logic**: Set timestamp for tasks where status='open' exists (indicates task is in todos)
5. **Rollback Strategy**: Backup database before migration, restore from backup if migration fails
6. **Idempotency**: Migration checks if already applied (workbench/todos tables exist), errors clearly if so
7. **Validation Strategy**: Pre-migration checks for data integrity (no orphaned records, valid enum values)

**Research Tasks**:
- [ ] Document SQLite transaction isolation levels and rollback behavior
- [ ] Research SQLAlchemy relationship patterns (one-to-one with optional target)
- [ ] Document foreign key cascade options (CASCADE vs RESTRICT vs SET NULL)
- [ ] Research Alembic best practices for complex schema migrations

### Phase 1: Design & Documentation

**Prerequisites**: `research.md` complete

**Objective**: Create complete data model, ERD diagrams, and migration specification.

**Deliverables**:
1. `data-model.md` - Three-table schema definition
2. `architecture.md` - ERD and migration flow diagrams (Mermaid format)

**Data Model Sections**:
1. **Tasks Table Schema**:
   - Columns: id, user_input, enriched_text, created_at, updated_at
   - Metadata: project, persons, task_type, priority, deadline_text, deadline_parsed, effort_estimate, dependencies, tags, extracted_at, requires_attention
   - Relationships: one-to-one (optional) with Workbench, one-to-one (optional) with Todo

2. **Workbench Table Schema**:
   - Columns: id, task_id (FK → tasks.id, unique), enrichment_status (enum), error_message, metadata_suggestions (JSON text), moved_to_todos_at, created_at, updated_at
   - Foreign Key: task_id CASCADE DELETE
   - Indexes: task_id, enrichment_status, moved_to_todos_at

3. **Todos Table Schema**:
   - Columns: id, task_id (FK → tasks.id, unique), status (enum), position (int), created_at, updated_at
   - Foreign Key: task_id CASCADE DELETE
   - Indexes: task_id, status, position

4. **Migration Logic**:
   - Step 1: Create workbench and todos tables
   - Step 2: Migrate enrichment_status + error_message → workbench entries
   - Step 3: Migrate status + position → todos entries (if status exists)
   - Step 4: Drop status, enrichment_status, error_message columns from tasks
   - Step 5: Add indexes for efficient queries
   - Step 6: Validate foreign key integrity

**Architecture Diagrams** (Mermaid in architecture.md):
1. **ERD**: Three-table structure with foreign key relationships
2. **Migration Flow**: State machine showing single-table → three-table transition
3. **Query Patterns**: Before (single-table) vs After (joined queries) comparison
4. **Rollback Flow**: Backup → Migration → Validation → Restore (if failed)

**Agent Context Update**:
- Run `.specify/scripts/bash/update-agent-context.sh claude`
- Add: SQLAlchemy 2.0 relationship patterns, Alembic migrations, SQLite foreign keys
- Preserve: Existing backend technologies from Features 001-004

### Phase 2: Test Specification (TDD Red Phase)

**Prerequisites**: Phase 1 design complete, tasks.md generated by `/speckit.tasks`

**Objective**: Write all tests FIRST (Red phase) before implementation. Tests must fail initially.

**Test Categories**:
1. **Contract Tests** (test_three_table_api.py):
   - Test GET /api/tasks returns identical JSON before/after migration
   - Test GET /api/tasks/{id} returns identical JSON before/after migration
   - Test POST /api/tasks creates entries in tasks + workbench tables
   - Test PATCH /api/tasks/{id}/metadata updates only tasks table
   - Test DELETE /api/tasks/{id} cascades to workbench and todos

2. **Integration Tests** (test_migration.py):
   - Test migration with sample database (1000 tasks)
   - Test migration handles tasks with only enrichment_status
   - Test migration handles tasks with only status
   - Test migration handles tasks with both states
   - Test migration sets correct moved_to_todos_at timestamps
   - Test migration assigns sequential positions to todos

3. **Integration Tests** (test_relationships.py):
   - Test Task.workbench relationship returns Workbench object
   - Test Task.todo relationship returns Todo object (optional)
   - Test deleting Task cascades to Workbench and Todo
   - Test foreign key constraint prevents orphaned workbench entries
   - Test unique constraint on workbench.task_id (one-to-one)

4. **Unit Tests** (test_models.py):
   - Test Workbench model creation with valid enrichment_status
   - Test Todo model creation with valid status
   - Test EnrichmentStatus enum values
   - Test TodoStatus enum values

**Deliverable**: All test files created, all tests FAILING (Red phase confirmed)

### Phase 3: Implementation (TDD Green Phase)

**Prerequisites**: All tests written and failing (Red phase confirmed)

**Objective**: Implement migration, models, and API updates to make tests pass (Green phase).

**Implementation Tasks**:
1. **Migration Script** (005_three_table_schema.py):
   - Create workbench table with foreign key to tasks
   - Create todos table with foreign key to tasks
   - Migrate data from tasks.enrichment_status → workbench.enrichment_status
   - Migrate data from tasks.status → todos.status
   - Drop old columns from tasks table
   - Add indexes on new tables

2. **Model Updates**:
   - Update Task model: add workbench and todo relationships, remove status/enrichment_status
   - Create Workbench model: define enrichment_status, error_message, metadata_suggestions, moved_to_todos_at
   - Create Todo model: define status, position
   - Update enums.py: add EnrichmentStatus and TodoStatus enums

3. **Service Updates**:
   - Update TaskService queries to join workbench for enrichment state
   - Update TaskService queries to join todos for execution state
   - Update EnrichmentService to write to workbench table
   - Implement "move to todos" logic (create todos entry, set moved_to_todos_at)

4. **API Updates**:
   - Update GET /api/tasks endpoint to join tables and transform response
   - Update GET /api/tasks/{id} endpoint to join tables
   - Update POST /api/tasks endpoint to create workbench entry
   - Update DELETE /api/tasks/{id} endpoint (cascade deletes handled by FK)
   - Ensure all responses match previous format (backward compatibility)

**Deliverable**: All tests PASSING (Green phase confirmed)

### Phase 4: Refactoring & Polish (TDD Refactor Phase)

**Prerequisites**: All tests passing (Green phase confirmed)

**Objective**: Optimize, document, and polish implementation without changing behavior.

**Refactoring Tasks**:
- Extract migration validation logic into helper functions
- Add detailed logging to migration script for troubleshooting
- Optimize query patterns (ensure indexes used correctly)
- Add database query plan analysis for performance verification
- Document API transformation logic (joined result → backward-compatible response)
- Add migration rollback documentation (restore from backup procedure)

**Documentation Updates**:
- Update CLAUDE.md with new models and architecture
- Document query patterns (when to join workbench vs todos)
- Add migration troubleshooting guide
- Document foreign key cascade behavior

**Deliverable**: Clean, documented, optimized implementation with all tests still passing

## Dependencies

**Upstream Dependencies** (must exist before this feature):
- ✅ Feature 001 (Chat Task Entry) - provides initial tasks table structure
- ✅ Feature 004 (Task Metadata Extraction) - extends tasks table with metadata fields
- ✅ Feature 003 (Task Lane Workflow) - provides Task Workbench concept (Pending, More Info, Ready lanes)

**Downstream Impact** (features that will use this refactored schema):
- Future features will reference new workbench and todos tables
- Query patterns established here (join workbench for enrichment, join todos for execution) become standard
- Archival strategies enabled by workbench.moved_to_todos_at field (future optimization)

**External Dependencies**:
- SQLAlchemy 2.0 (already installed)
- Alembic 1.12+ (already installed)
- SQLite with foreign key support (already enabled)
- pytest + pytest-asyncio (already installed)

**No new external dependencies required.**

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Migration fails midway** | High | Low | Use SQLite transactions (atomic all-or-nothing), pre-migration validation, backup before migration |
| **Data loss during migration** | High | Low | Comprehensive tests on sample data, record count validation, checksum verification |
| **Foreign key constraint violation** | Medium | Medium | Pre-migration validation checks all task_id references valid, fail early with clear error |
| **API backward compatibility breaks** | High | Medium | Contract tests verify byte-for-byte response equality before/after migration |
| **Query performance degrades** | Medium | Low | Benchmark queries before/after, ensure indexes on join columns, query plan analysis |
| **Concurrent writes during migration** | High | Low | Require maintenance window or read-only mode (documented in assumptions) |
| **Rollback complexity** | Medium | Low | Backup before migration, document restore procedure (simpler than automated downgrade) |

## Success Metrics

**From Success Criteria (spec.md)**:
- SC-001: 100% data migration success - verify record counts match
- SC-002: API responses identical - byte-for-byte JSON comparison passes
- SC-003: Query performance maintained - benchmark results ≤ baseline
- SC-004: Todo operations <100ms - performance test for 1000 tasks
- SC-005: Zero orphaned records - foreign key integrity checks pass
- SC-006: Migration completes in <5 min for 10k tasks - timed migration test

**Measurement Plan**:
1. **Pre-migration**: Capture record counts, API response samples, query execution times
2. **Post-migration**: Re-capture same metrics, compare
3. **Validation**: Run automated test suite comparing before/after
4. **Performance**: Use EXPLAIN QUERY PLAN to verify index usage

## Next Steps

1. ✅ **Phase 0 Complete**: Generate `research.md` with migration strategy decisions
2. ✅ **Phase 1 Complete**: Generate `data-model.md` and `architecture.md` with ERD diagrams
3. ⏳ **Phase 2 Pending**: Run `/speckit.tasks` to generate task breakdown (tasks.md)
4. ⏳ **Phase 3 Pending**: Execute tasks in Red-Green-Refactor order
5. ⏳ **Phase 4 Pending**: Deploy migration to test environment, validate, then production
