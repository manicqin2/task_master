# Feature Specification: Three-Table Schema Architecture

**Feature Branch**: `005-three-table-schema`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "Refactor the database from a single monolithic tasks table into a clean three-table architecture that separates concerns by lifecycle and responsibility. Currently, the tasks table mixes immutable task data (what needs to be done) with transient enrichment workflow state (enrichment_status) and execution workflow state (task status). This makes it difficult to reason about lifecycles, query efficiently, and manage data retention."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless Data Migration (Priority: P1)

As a system administrator, when the three-table schema migration runs, all existing task data is successfully migrated from the old single-table structure to the new three-table structure without data loss or system downtime. Users continue to interact with the Task Workbench and todo list exactly as before, unaware that the underlying database structure has changed.

**Why this priority**: Foundation for entire refactor - without successful data migration, the feature cannot proceed. This is the critical path that enables all other improvements while ensuring zero disruption to existing users.

**Independent Test**: Can be fully tested by running the migration on a copy of production data, verifying all records are correctly distributed across the three tables, and confirming that existing API endpoints return identical responses before and after migration.

**Acceptance Scenarios**:

1. **Given** a database with 1000 existing tasks in various states (pending enrichment, in More Info lane, completed in todos), **When** the migration script runs, **Then** all 1000 tasks are correctly distributed with task data in `tasks` table, enrichment state in `workbench` table, and execution state in `todos` table, with zero data loss.

2. **Given** tasks with enrichment_status='pending', **When** migration completes, **Then** workbench entries are created with enrichment_status='pending' and the tasks table no longer contains enrichment_status column.

3. **Given** tasks with status='open' (in todo list), **When** migration completes, **Then** todos entries are created with status='open', position is preserved, and tasks table no longer contains status column.

4. **Given** the migration has completed successfully, **When** API endpoint GET /api/tasks/{id} is called, **Then** response contains all task data, enrichment state, and execution state exactly as it did before migration (backward compatibility maintained).

---

### User Story 2 - Efficient Task Workbench Queries (Priority: P2)

As a user viewing the Task Workbench (Pending, More Info, Ready lanes), the system queries only the workbench table to determine which lane each task belongs to, resulting in faster page loads and more efficient database operations compared to the previous single-table approach.

**Why this priority**: Delivers the primary architectural benefit of separation of concerns - enables query optimization and clearer code structure. Not P1 because migration must work first, but essential for realizing the refactoring benefits.

**Independent Test**: Can be tested by measuring query execution time for Task Workbench lane rendering before and after refactor, and verifying that database query plans show workbench-only queries (no joins to todos table when rendering lanes).

**Acceptance Scenarios**:

1. **Given** a user opens the Task Workbench view, **When** the frontend requests tasks by enrichment status, **Then** the backend queries only `tasks` + `workbench` tables (joins), not the `todos` table.

2. **Given** 100 tasks in the Pending lane, **When** rendering the lane, **Then** query execution time is equal to or faster than the previous single-table approach.

3. **Given** a task in the More Info lane (workbench.enrichment_status='failed'), **When** user views the lane, **Then** the task appears with error message and metadata editor, queried efficiently from workbench table only.

---

### User Story 3 - Independent Todo List Management (Priority: P2)

As a user managing their todo list (marking tasks complete, reordering, archiving), the system updates only the todos table without affecting the immutable task data or workbench enrichment records, enabling cleaner data lifecycle management and potential future archival strategies.

**Why this priority**: Complements User Story 2 by providing the execution workflow separation. Together they demonstrate the full benefit of the three-table architecture. P2 because it depends on migration success but is equally important to workbench queries.

**Independent Test**: Can be tested by performing todo list operations (complete, archive, reorder) and verifying via database inspection that only the `todos` table is updated, while `tasks` and `workbench` tables remain unchanged.

**Acceptance Scenarios**:

1. **Given** a task in the todo list with status='open', **When** user marks it complete, **Then** only `todos.status` is updated to 'completed', and `tasks` and `workbench` records are unchanged.

2. **Given** 5 tasks in the todo list with positions 1-5, **When** user drags task at position 1 to position 3, **Then** only `todos.position` values are updated, reflecting new ordering.

3. **Given** a completed task, **When** user archives it, **Then** `todos.status` changes to 'archived', and the task remains queryable for historical reporting while the `workbench` entry could optionally be deleted (future enhancement).

---

### User Story 4 - Moving Tasks from Workbench to Todos (Priority: P1)

As a user interacting with the Task Workbench, when a task in the Ready lane is moved to the todo list, the system creates a new `todos` entry and sets `workbench.moved_to_todos_at` timestamp, maintaining referential integrity and enabling tracking of when tasks graduate from creation workflow to execution workflow.

**Why this priority**: Critical transition point between the two workflows - must work correctly for users to progress tasks through the system. This is the bridge between enrichment and execution, making it essential (P1).

**Independent Test**: Can be tested by moving a task from Ready lane to todo list via UI, then verifying database state shows new todos entry created, workbench.moved_to_todos_at set, and task appears in todo list view.

**Acceptance Scenarios**:

1. **Given** a task in Ready lane (workbench.enrichment_status='completed', has project metadata), **When** user clicks "Move to Todos" button, **Then** a new `todos` entry is created with status='open', position set to bottom of list, and `workbench.moved_to_todos_at` timestamp is set to current time.

2. **Given** a task just moved to todos, **When** user views the todo list, **Then** the task appears at the bottom with status='open' and displays all task metadata from the `tasks` table.

3. **Given** a task with `moved_to_todos_at` set, **When** querying the Workbench view, **Then** the task no longer appears in any lane (Ready, Pending, More Info) because it has graduated to the execution workflow.

---

### Edge Cases

- **What happens when migration fails midway?** System must support transaction rollback or provide a recovery script to restore the previous single-table state. Migration script should validate data integrity before committing changes.

- **What happens to tasks that have both enrichment_status and status set?** (e.g., task in both workbench AND todos). Migration logic must handle this by creating both workbench and todos entries if both states exist, with appropriate moved_to_todos_at timestamp.

- **How does system handle foreign key constraint violations during migration?** Migration script must validate all foreign key relationships before dropping old columns, and fail gracefully with clear error messages if orphaned records are detected.

- **What happens when querying a task that exists in tasks but has no workbench or todos entry?** API should handle this gracefully by returning task data with null enrichment_status and status, rather than failing with 404 or database error.

- **How are cascade deletes handled?** When a task is deleted from `tasks` table, both `workbench` and `todos` entries must cascade delete automatically via foreign key constraints to maintain referential integrity.

- **What happens to archived workbench entries in the future?** Spec should clarify retention policy: workbench entries older than N days with moved_to_todos_at set could be archived/deleted to save space, while tasks and todos persist.

- **How does system handle concurrent writes during migration?** Migration should run during maintenance window or lock tables to prevent concurrent writes that could cause data inconsistency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST migrate all existing task data from the single `tasks` table into three separate tables (`tasks`, `workbench`, `todos`) without data loss or corruption.

- **FR-002**: System MUST create a `tasks` table containing only immutable task content and metadata (user_input, enriched_text, project, persons, deadline, priority, task_type, effort_estimate, dependencies, tags, extracted_at, requires_attention).

- **FR-003**: System MUST create a `workbench` table containing enrichment workflow state (task_id foreign key, enrichment_status, error_message, metadata_suggestions, moved_to_todos_at, created_at, updated_at).

- **FR-004**: System MUST create a `todos` table containing execution workflow state (task_id foreign key, status, position, created_at, updated_at).

- **FR-005**: System MUST enforce one-to-one relationships between `tasks` and `workbench` via unique foreign key constraint on `workbench.task_id`.

- **FR-006**: System MUST enforce one-to-one relationships between `tasks` and `todos` via unique foreign key constraint on `todos.task_id`.

- **FR-007**: System MUST configure foreign key constraints with CASCADE DELETE so that deleting a task automatically deletes associated workbench and todos entries.

- **FR-008**: System MUST migrate existing `enrichment_status` values from tasks table to new `workbench.enrichment_status` column.

- **FR-009**: System MUST migrate existing `status` values (open, completed, archived) from tasks table to new `todos.status` column for tasks that are in the todo list.

- **FR-010**: System MUST migrate existing `error_message` values from tasks table to `workbench.error_message` column.

- **FR-011**: System MUST remove `status`, `enrichment_status`, and `error_message` columns from the `tasks` table after successful migration to workbench and todos tables.

- **FR-012**: System MUST maintain backward compatibility for all existing API endpoints by joining the three tables when returning task data in responses.

- **FR-013**: Task Workbench queries MUST query only `tasks` + `workbench` tables when rendering lanes (Pending, More Info, Ready), not the `todos` table.

- **FR-014**: Todo list queries MUST query only `tasks` + `todos` tables when rendering the todo list, not the `workbench` table.

- **FR-015**: System MUST set `workbench.moved_to_todos_at` timestamp when a task is moved from Ready lane to the todo list.

- **FR-016**: System MUST create a new `todos` entry with status='open' when a task is moved from Ready lane to todo list.

- **FR-017**: System MUST support querying tasks by enrichment status (pending, processing, completed, failed) via the `workbench` table.

- **FR-018**: System MUST support querying tasks by execution status (open, completed, archived) via the `todos` table.

- **FR-019**: System MUST create database indexes on `workbench.task_id`, `workbench.enrichment_status`, `todos.task_id`, `todos.status`, and `todos.position` for efficient queries.

- **FR-020**: System MUST validate referential integrity during migration by ensuring all task_id references in workbench and todos point to existing tasks.

- **FR-021**: SQLAlchemy models MUST define proper relationships between Task, Workbench, and Todo models using `relationship()` with appropriate back_populates and cascade options.

- **FR-022**: Migration script MUST be idempotent (can be run multiple times safely) or provide clear error messages if already applied.

### Key Entities

- **Task (tasks table)**: Core immutable task entity representing what needs to be done. Contains task content (user_input, enriched_text) and metadata (project, persons, deadline, priority, task_type, effort_estimate, dependencies, tags, extracted_at, requires_attention). Created once when user submits a task, rarely changes. Primary key: id (string/UUID). Relationships: one-to-one with Workbench, one-to-one with Todo (optional).

- **Workbench (workbench table)**: Represents task's position in the enrichment workflow. Contains enrichment_status (pending, processing, completed, failed), error_message for failures, metadata_suggestions (JSON) for "Need Attention" UI, moved_to_todos_at timestamp tracking graduation to todos. Lifecycle: created with task, exists during enrichment, can be archived after moved_to_todos_at is set. Primary key: id (string/UUID). Foreign key: task_id → tasks.id (unique).

- **Todo (todos table)**: Represents task's position in the execution workflow. Contains status (open, completed, archived), position (integer for drag-drop ordering). Lifecycle: created when task moves from Ready lane to todo list, long-lived (persists even when archived for historical tracking). Primary key: id (string/UUID). Foreign key: task_id → tasks.id (unique).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing tasks are successfully migrated to the new three-table structure with zero data loss, verified by comparing record counts and data checksums before and after migration.

- **SC-002**: All existing API endpoints return responses identical to pre-migration responses (byte-for-byte comparison of JSON) to maintain backward compatibility.

- **SC-003**: Task Workbench lane rendering queries execute in equal or less time compared to single-table queries, measured via database query execution plans and benchmarks.

- **SC-004**: Todo list operations (mark complete, reorder, archive) complete in under 100ms for lists containing up to 1000 tasks.

- **SC-005**: System maintains referential integrity with zero orphaned records (workbench or todos entries without corresponding tasks) after migration and during normal operation.

- **SC-006**: Migration script completes successfully on test database containing 10,000 tasks within 5 minutes.

- **SC-007**: Database storage efficiency improves or remains unchanged after refactoring (total table size for three tables ≤ previous single table size + 10% overhead for indexes).

- **SC-008**: Zero regression bugs reported for Task Workbench or todo list functionality after deploying the refactored schema to production.

- **SC-009**: Task creation workflow (submit → enrich → workbench lanes → move to todos) completes successfully with 100% success rate in integration tests.

- **SC-010**: System can archive or delete old workbench entries (with moved_to_todos_at older than 90 days) without affecting task data or todos functionality (demonstrates data retention benefit).

## Dependencies

- Requires existing Features 001 (Chat Task Entry), 003 (Task Lane Workflow), and 004 (Task Metadata Extraction) to be implemented, as this refactor reorganizes data created by those features.
- Depends on SQLAlchemy 2.0 for defining relationships and migrations via Alembic.
- Requires database backup and restore capability for rollback if migration fails.
- May require read-only mode or maintenance window for migration execution to prevent concurrent write conflicts.

## Assumptions

- Migration will be run during a maintenance window or with application in read-only mode to prevent concurrent writes causing data inconsistency.
- Existing data follows the expected schema (tasks.enrichment_status has valid enum values, tasks.status has valid enum values).
- Foreign key constraints are supported by the database (SQLite supports foreign keys when enabled).
- All tasks that exist in the system have either an enrichment workflow state (workbench) or execution workflow state (todos), or both - no tasks exist without any state.
- Position ordering in todos table starts from 1 and increments sequentially for existing tasks.
- Workbench entries for tasks moved to todos more than 90 days ago can be considered for archival in future optimizations.
- API response structure remains unchanged (responses still include enrichment_status and status fields even though they now come from joined tables).
- No new user-facing features are introduced - this is purely an internal refactoring for architectural benefits.
- System can tolerate the additional join cost (tasks + workbench or tasks + todos) for individual task queries, as the benefit comes from filtering/aggregation queries that now target smaller tables.

## Out of Scope

- Automatic archival or deletion of old workbench entries (future enhancement - this spec only creates the schema structure to enable it).
- Performance optimizations beyond basic indexing (e.g., database partitioning, read replicas).
- Changes to API response structure or field names (maintaining backward compatibility is a requirement, not an option).
- Migration from three-table schema back to single-table schema (rollback support is limited to restoring from backup, not automated downgrade).
- Support for tasks existing in both workbench AND todos simultaneously (tasks graduate from workbench to todos, not exist in both - moved_to_todos_at tracks transition).
- Real-time replication or zero-downtime migration strategies (assumes maintenance window is acceptable).
- Changes to frontend UI components (UI remains identical, only backend data source changes).
- Multi-database support or sharding strategies for very large datasets (assumes single SQLite database).
- Audit logging of migration process (basic validation is included, but detailed audit trail is out of scope).
