# Data Model: Task Metadata Extraction

**Feature**: 004-task-metadata-extraction
**Created**: 2025-11-05
**Related**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities and their relationships for the Task Metadata Extraction feature. The feature extends the existing Task model with structured metadata fields and introduces new entities for handling ambiguous extractions.

---

## Entity Definitions

### 1. TaskMetadata (Embedded in Task)

**Purpose**: Structured metadata extracted from task descriptions via LLM processing.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `project` | string? | max 100 chars | Project or category name (e.g., "Work", "ProjectX") |
| `persons` | string[] | JSON array | Names of people mentioned (e.g., ["Sarah Johnson", "Mike Chen"]) |
| `task_type` | enum? | see values below | Category of task |
| `priority` | enum? | see values below | Urgency level |
| `deadline_text` | string? | max 200 chars | Original deadline phrase from user input (e.g., "tomorrow", "next Friday") |
| `deadline_parsed` | datetime? | timezone-aware | Normalized datetime calculated from deadline_text |
| `effort_estimate` | integer? | minutes | Estimated time to complete if mentioned |
| `dependencies` | string[] | JSON array | Blockers or prerequisites mentioned |
| `tags` | string[] | JSON array | User-defined or auto-extracted tags (e.g., ["#bug", "#urgent"]) |
| `metadata_suggestions` | JSON | JSON object | Full MetadataExtractionResponse stored as JSON text (backend storage). API transforms this to `suggestions` object for frontend. |
| `extracted_at` | datetime | timezone-aware | Timestamp when extraction occurred |
| `requires_attention` | boolean | default false | Whether task needs user review due to low confidence |

**Enums**:

```python
# task_type
TaskType = Literal[
    "meeting",
    "call",
    "email",
    "review",
    "development",
    "research",
    "administrative",
    "other"
]

# priority
Priority = Literal[
    "low",
    "normal",
    "high",
    "urgent"
]
```

**Validation Rules**:
- `project`: If present, must be non-empty and trimmed
- `persons`: Array elements must be non-empty strings
- `deadline_text`: Preserved exactly as extracted by LLM (not normalized)
- `deadline_parsed`: Must be in future if present (validation: warn if past)
- `effort_estimate`: Must be > 0 if present
- `metadata_suggestions`: Must be valid JSON string, parseable as `MetadataExtractionResponse`

**Relationships**:
- One-to-one with `Task` (embedded fields, not separate table)
- `metadata_suggestions` references `MetadataExtractionResponse` schema (stored as JSON text in database)
- API layer transforms `metadata_suggestions` to `suggestions` field in TaskMetadata response (see contracts/metadata-extraction.yaml)

**State Transitions**:
```
Initial State: All metadata fields NULL, requires_attention = false
    ↓ (after LLM extraction)
Extracted State: Fields populated based on confidence thresholds
    ├─→ Complete (requires_attention = false): All high-confidence fields auto-populated
    └─→ Needs Attention (requires_attention = true): One or more fields below confidence threshold
        ↓ (after user input)
Confirmed State: User has reviewed and confirmed/edited metadata
```

**Indexes**:
- `idx_task_project` on `project` (for filtering by project)
- `idx_task_deadline_parsed` on `deadline_parsed` (for deadline queries)
- `idx_task_requires_attention` on `requires_attention` (for "Need Attention" lane)
- `idx_task_priority` on `priority` (for priority sorting)

---

### 2. MetadataExtractionResponse (Schema only, not persisted)

**Purpose**: Structured response from LLM metadata extraction, including confidence scores. Stored as JSON in `Task.metadata_suggestions`.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `project` | string? | max 100 chars | Extracted project name |
| `project_confidence` | float | 0.0-1.0 | Confidence score for project extraction |
| `persons` | string[] | JSON array | Extracted person names |
| `persons_confidence` | float | 0.0-1.0 | Confidence score for persons extraction |
| `deadline` | string? | max 200 chars | Extracted deadline text (original phrasing) |
| `deadline_confidence` | float | 0.0-1.0 | Confidence score for deadline extraction |
| `task_type` | TaskType? | see enum | Extracted task type |
| `task_type_confidence` | float | 0.0-1.0 | Confidence score for type classification |
| `priority` | Priority? | see enum | Extracted priority |
| `priority_confidence` | float | 0.0-1.0 | Confidence score for priority determination |
| `effort_estimate` | integer? | minutes | Extracted effort estimate |
| `effort_confidence` | float | 0.0-1.0 | Confidence score for effort extraction |
| `dependencies` | string[] | JSON array | Extracted dependencies |
| `dependencies_confidence` | float | 0.0-1.0 | Confidence score for dependencies |
| `tags` | string[] | JSON array | Extracted tags |
| `tags_confidence` | float | 0.0-1.0 | Confidence score for tags |
| `chain_of_thought` | string? | text | LLM reasoning process (debug only) |

**Validation Rules**:
- All confidence scores must be between 0.0 and 1.0 (inclusive)
- Confidence score of 0.0 implies field value is NULL or empty

**Usage**:
- Returned by `MetadataExtractor.extract()` service method
- Stored as JSON string in `Task.metadata_suggestions` (backend database field)
- API transforms to per-field `suggestions` object (FieldSuggestion schema) when `requires_attention=true`
- Frontend receives transformed `suggestions` in TaskMetadata response to render "Need Attention" lane UI

---

### 3. ExistingEntity Updates

#### Task (Extended)

**Existing Attributes** (from Feature 001):
- `id`: Primary key (UUID or int)
- `user_input`: Original task description text
- `enriched_text`: LLM-enhanced description
- `enrichment_status`: pending | processing | completed | failed
- `created_at`: Timestamp
- `updated_at`: Timestamp

**New Attributes** (Feature 004):
- All `TaskMetadata` fields listed in Section 1 above

**Modified Behavior**:
- `enrichment_status` now includes metadata extraction as part of "processing" phase
- `enriched_text` generation remains separate from metadata extraction (both happen in parallel or sequentially)

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────┐
│  Task                                                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Core Fields (Feature 001)                         │ │
│  │  - id, user_input, enriched_text                  │ │
│  │  - enrichment_status, created_at, updated_at      │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ TaskMetadata (Feature 004 - Embedded)             │ │
│  │  - project, persons, task_type, priority          │ │
│  │  - deadline_text, deadline_parsed                 │ │
│  │  - effort_estimate, dependencies, tags            │ │
│  │  - metadata_suggestions (JSON)                    │ │
│  │  - extracted_at, requires_attention               │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        │ metadata_suggestions (JSON field)
                        ▼
        ┌─────────────────────────────────┐
        │ MetadataExtractionResponse      │
        │  (Schema only, stored as JSON)  │
        │                                 │
        │  - All extracted fields         │
        │  - Per-field confidence scores  │
        │  - chain_of_thought (debug)     │
        └─────────────────────────────────┘
```

**Notes**:
- No separate `TaskMetadata` table; fields embedded in `Task` for simplicity
- `MetadataExtractionResponse` is not a database entity; it's a Pydantic schema for the JSON stored in `metadata_suggestions`
- Relationship is 1:1 (one Task has one set of metadata)

---

## Data Access Patterns

### 1. Create Task with Metadata Extraction

**Flow**:
1. Insert new `Task` with `user_input`, set `enrichment_status = pending`, all metadata fields NULL
2. Queue background task for metadata extraction
3. LLM extracts metadata → `MetadataExtractionResponse`
4. Update `Task`:
   - Populate metadata fields where confidence >= 0.7
   - Store full `MetadataExtractionResponse` as JSON in `metadata_suggestions`
   - Set `requires_attention = true` if any field confidence < 0.7
   - Set `extracted_at = now()`

**SQL (conceptual)**:
```sql
-- Step 1: Insert task
INSERT INTO tasks (id, user_input, enrichment_status, created_at)
VALUES (:id, :user_input, 'pending', NOW());

-- Step 4: Update after extraction
UPDATE tasks
SET
    project = CASE WHEN :project_conf >= 0.7 THEN :project ELSE NULL END,
    persons = CASE WHEN :persons_conf >= 0.7 THEN :persons ELSE NULL END,
    deadline_text = CASE WHEN :deadline_conf >= 0.7 THEN :deadline ELSE NULL END,
    deadline_parsed = CASE WHEN :deadline_conf >= 0.7 THEN :deadline_parsed ELSE NULL END,
    task_type = CASE WHEN :type_conf >= 0.7 THEN :task_type ELSE NULL END,
    priority = CASE WHEN :priority_conf >= 0.7 THEN :priority ELSE NULL END,
    metadata_suggestions = :full_response_json,
    extracted_at = NOW(),
    requires_attention = (
        :project_conf < 0.7 OR :project IS NULL
    )
WHERE id = :id;
```

### 2. Query Tasks by Metadata

**Use Cases**:
- Filter tasks by project: `WHERE project = 'Work'`
- Find overdue tasks: `WHERE deadline_parsed < NOW() AND enrichment_status != 'completed'`
- Get tasks needing attention: `WHERE requires_attention = true`
- Sort by priority: `ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END`

**Indexes Required**:
- `idx_task_project` (B-tree on project)
- `idx_task_deadline_parsed` (B-tree on deadline_parsed)
- `idx_task_requires_attention` (B-tree on requires_attention)
- `idx_task_priority` (B-tree on priority for sorting)

### 3. Update Metadata (User Confirmation)

**Flow**:
1. User reviews task in "Need Attention" lane
2. User confirms or edits suggested values
3. Update task with user-provided values, set `requires_attention = false`

**SQL (conceptual)**:
```sql
UPDATE tasks
SET
    project = :user_confirmed_project,
    persons = :user_confirmed_persons,
    deadline_text = :user_confirmed_deadline_text,
    deadline_parsed = :user_confirmed_deadline_parsed,
    task_type = :user_confirmed_type,
    priority = :user_confirmed_priority,
    requires_attention = false
WHERE id = :id;
```

---

## Data Constraints and Invariants

### Constraints

1. **Confidence Consistency**: If a field in `metadata_suggestions` has confidence < 0.7, that field in the Task entity MUST be NULL (or empty array for list fields)

2. **Deadline Pairing**: If `deadline_text` is not NULL, `deadline_parsed` SHOULD be not NULL (may fail parsing, but attempt must be made)

3. **Attention Flag**: `requires_attention = true` IFF the `project` field (REQUIRED for Ready lane) has confidence < 0.7 OR is NULL. Other fields (persons, deadline, type, priority) are optional and low confidence does not trigger `requires_attention`.

4. **Immutability**: Once metadata is extracted and `extracted_at` is set, metadata fields should not be re-extracted unless explicitly requested (prevents overwriting user edits)

### Invariants

- **I1**: `extracted_at` is NULL ⟹ all metadata fields are NULL
- **I2**: `metadata_suggestions` is not NULL ⟹ `extracted_at` is not NULL
- **I3**: `requires_attention = true` ⟹ `project` field in `metadata_suggestions` has confidence < 0.7 or is NULL (project is the only required field)
- **I4**: `deadline_parsed` is not NULL ⟹ `deadline_text` is not NULL (but converse not guaranteed)

---

## Migration Strategy

### Database Migration (Alembic)

**Migration File**: `alembic/versions/004_add_task_metadata.py`

**Changes**:
1. Add new columns to `tasks` table:
   - `project VARCHAR(100) NULL`
   - `persons JSON NULL` (SQLite: TEXT with JSON validation)
   - `task_type VARCHAR(50) NULL`
   - `priority VARCHAR(20) NULL`
   - `deadline_text VARCHAR(200) NULL`
   - `deadline_parsed TIMESTAMP WITH TIME ZONE NULL`
   - `effort_estimate INTEGER NULL`
   - `dependencies JSON NULL`
   - `tags JSON NULL`
   - `metadata_suggestions TEXT NULL` (JSON string)
   - `extracted_at TIMESTAMP WITH TIME ZONE NULL`
   - `requires_attention BOOLEAN NOT NULL DEFAULT FALSE`

2. Create indexes:
   - `CREATE INDEX idx_task_project ON tasks(project)`
   - `CREATE INDEX idx_task_deadline_parsed ON tasks(deadline_parsed)`
   - `CREATE INDEX idx_task_requires_attention ON tasks(requires_attention)`
   - `CREATE INDEX idx_task_priority ON tasks(priority)`

**Rollback Plan**:
- Drop indexes first
- Drop columns (ALTER TABLE DROP COLUMN)
- No data migration needed (backward compatible - new fields are nullable)

---

## Example Data

### Task with Complete Metadata

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_input": "Call Sarah Johnson tomorrow at 3pm about ProjectX quarterly review - urgent",
  "enriched_text": "Schedule a phone call with Sarah Johnson tomorrow afternoon to discuss the quarterly review for ProjectX. This is marked as urgent.",
  "enrichment_status": "completed",
  "created_at": "2025-11-05T10:00:00Z",
  "updated_at": "2025-11-05T10:00:05Z",

  "project": "ProjectX",
  "persons": ["Sarah Johnson"],
  "task_type": "call",
  "priority": "urgent",
  "deadline_text": "tomorrow at 3pm",
  "deadline_parsed": "2025-11-06T15:00:00Z",
  "effort_estimate": 30,
  "dependencies": [],
  "tags": ["#quarterly-review"],
  "extracted_at": "2025-11-05T10:00:03Z",
  "requires_attention": false,

  "metadata_suggestions": "{\"project\":\"ProjectX\",\"project_confidence\":0.95,\"persons\":[\"Sarah Johnson\"],\"persons_confidence\":1.0,\"deadline\":\"tomorrow at 3pm\",\"deadline_confidence\":1.0,\"task_type\":\"call\",\"task_type_confidence\":1.0,\"priority\":\"urgent\",\"priority_confidence\":1.0,\"effort_estimate\":30,\"effort_confidence\":0.6,\"dependencies\":[],\"dependencies_confidence\":0.0,\"tags\":[\"#quarterly-review\"],\"tags_confidence\":0.7,\"chain_of_thought\":\"Identified 'call' action verb → task_type=call. 'urgent' keyword → priority=urgent. Full name 'Sarah Johnson' → persons confidence 1.0.\"}"
}
```

### Task Requiring Attention (Ambiguous Project)

```json
{
  "id": "234e5678-e89b-12d3-a456-426614174001",
  "user_input": "Send report by Friday",
  "enriched_text": "Prepare and send a report by end of day Friday.",
  "enrichment_status": "completed",
  "created_at": "2025-11-05T11:00:00Z",
  "updated_at": "2025-11-05T11:00:04Z",

  "project": null,
  "persons": [],
  "task_type": "email",
  "priority": "normal",
  "deadline_text": "by Friday",
  "deadline_parsed": "2025-11-08T23:59:59Z",
  "effort_estimate": null,
  "dependencies": [],
  "tags": [],
  "extracted_at": "2025-11-05T11:00:02Z",
  "requires_attention": true,

  "metadata_suggestions": "{\"project\":null,\"project_confidence\":0.2,\"persons\":[],\"persons_confidence\":0.0,\"deadline\":\"by Friday\",\"deadline_confidence\":0.9,\"task_type\":\"email\",\"task_type_confidence\":0.7,\"priority\":\"normal\",\"priority_confidence\":0.5,\"effort_estimate\":null,\"effort_confidence\":0.0,\"dependencies\":[],\"dependencies_confidence\":0.0,\"tags\":[],\"tags_confidence\":0.0,\"chain_of_thought\":\"No explicit recipient → persons_confidence=0. No project mentioned → project_confidence=0.2. 'send report' suggests email → task_type=email.\"}"
}
```

---

## Performance Considerations

### Query Optimization

1. **Index Usage**:
   - Queries filtering by `project`, `priority`, `requires_attention` will benefit from indexes
   - Deadline queries (`WHERE deadline_parsed < NOW()`) use B-tree index

2. **JSON Field Access**:
   - `metadata_suggestions` is TEXT/JSON; avoid querying inside JSON (use top-level fields instead)
   - Frontend parses `metadata_suggestions` client-side for "Need Attention" UI

3. **Bulk Updates**:
   - Metadata extraction is asynchronous, no batch operations needed
   - If re-extraction is needed, process in background queue

### Storage Estimates

- **Per Task Overhead**: ~500 bytes for metadata fields (excluding `metadata_suggestions` JSON)
- **metadata_suggestions**: ~1-2 KB JSON string per task
- **Total**: ~2-3 KB per task (vs ~500 bytes without metadata)

---

## Security and Privacy

### Data Sensitivity

- **Person Names**: May contain PII (Personally Identifiable Information)
  - Mitigation: Assume task data is already sensitive (user_input contains same info)
  - No additional encryption needed beyond existing task security

- **Projects**: May reveal organizational structure
  - Mitigation: Access control at task level (not metadata-specific)

- **Chain of Thought**: Debug data, may expose LLM reasoning
  - Mitigation: Only expose in debug mode, not to regular users

### Access Control

- Metadata visibility tied to task visibility
- No separate permissions for metadata fields
- `metadata_suggestions` (including chain_of_thought) should be admin-only or debug-mode-only

---

**Last Updated**: 2025-11-05
**Next Steps**: Define API contracts in `contracts/metadata-extraction.yaml`
