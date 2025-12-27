# Data Model: Gemini LLM Integration

## Overview

This feature does NOT introduce new database entities or schema changes. The migration from Ollama to Gemini is purely an infrastructure change at the LLM client level. However, this document captures the key data structures and entities involved in the enrichment workflow.

## Existing Entities (Unchanged)

### Task Entity

**Location:** `backend/src/models/task.py`

**Purpose:** Core task entity with metadata fields

**Key Fields:**
- `id`: str - UUID primary key
- `user_input`: str - Raw user input text
- `enriched_text`: str | None - LLM-enriched task description
- `project`: str | None - Extracted project name
- `persons`: str | None - JSON array of person names
- `task_type`: str | None - Task category (meeting, call, email, etc.)
- `priority`: str | None - Priority level (low, normal, high, urgent)
- `deadline_text`: str | None - Natural language deadline
- `deadline_parsed`: datetime | None - Parsed deadline datetime
- `effort_estimate`: int | None - Estimated effort in minutes
- `dependencies`: str | None - JSON array of dependencies
- `tags`: str | None - JSON array of tags
- `extracted_at`: datetime | None - When metadata was extracted
- `requires_attention`: bool - Whether task needs user review

**Relationships:**
- 1:1 with Workbench (enrichment workflow state)
- 1:1 with Todo (execution workflow state)

**No Changes Required:** All fields remain identical. Gemini will populate the same fields that Ollama currently fills.

---

### Workbench Entity

**Location:** `backend/src/models/workbench.py`

**Purpose:** Tracks enrichment workflow state

**Key Fields:**
- `id`: str - UUID primary key
- `task_id`: str - Foreign key to tasks
- `enrichment_status`: str - pending | processing | completed | failed
- `error_message`: str | None - Error details if enrichment failed
- `metadata_suggestions`: str | None - JSON with LLM extraction results
- `moved_to_todos_at`: datetime | None - When moved to todo list

**No Changes Required:** Gemini integration maintains the same workflow states.

---

## New Internal Data Structures (Not Persisted)

### GeminiClientConfig

**Location:** `backend/src/lib/gemini_client.py`

**Purpose:** Configuration for Gemini API client

**Fields:**
```python
@dataclass
class GeminiClientConfig:
    api_key: str                    # From GEMINI_API_KEY env var
    model: str = "gemini-2.5-flash"  # Model name
    timeout: float = 15.0            # Request timeout in seconds
    max_retries: int = 3             # Number of retry attempts
    enable_retry: bool = True        # Enable exponential backoff
```

**Validation:**
- `api_key` must not be empty
- `model` must be a supported Gemini model name
- `timeout` must be between 5 and 120 seconds
- `max_retries` must be between 0 and 10

---

### MetadataExtractionRequest

**Location:** `backend/src/services/metadata_extraction.py`

**Purpose:** Request payload for LLM metadata extraction

**Fields:**
```python
@dataclass
class MetadataExtractionRequest:
    task_text: str           # Natural language task description
    reference_time: datetime  # For relative date parsing (e.g., "tomorrow")
```

**No Changes:** Same structure as with Ollama.

---

### MetadataExtractionResponse

**Location:** `backend/src/models/task_metadata.py` (existing Pydantic model)

**Purpose:** LLM response with extracted metadata and confidence scores

**Fields:**
```python
class MetadataExtractionResponse(BaseModel):
    project: str | None
    project_confidence: float

    persons: list[str]
    persons_confidence: float

    deadline: str | None
    deadline_confidence: float

    task_type: str | None
    task_type_confidence: float

    priority: str | None
    priority_confidence: float

    effort_estimate: int | None
    effort_confidence: float

    dependencies: list[str]
    dependencies_confidence: float

    tags: list[str]
    tags_confidence: float

    chain_of_thought: str | None  # LLM reasoning (optional)
```

**Key Change:** With Gemini's native Pydantic support, this model can be used directly as `response_schema` parameter, eliminating manual JSON parsing.

**Confidence Threshold:** 0.7 (70%) - values below this threshold trigger "needs attention" workflow.

---

## Data Flow

```
User Input (string)
    ↓
GeminiClient.enrich_task()
    ↓
Gemini API (google-genai SDK)
    ↓
Enriched Text (string)
    ↓
MetadataExtractor.extract()
    ↓
Gemini API with Pydantic schema
    ↓
MetadataExtractionResponse (structured data)
    ↓
Task entity (persisted to database)
```

**No Changes to Data Flow:** The flow remains identical to Ollama integration. Only the LLM provider changes.

---

## Error Handling Data Structures

### GeminiAPIError

**Location:** `backend/src/lib/gemini_client.py`

**Purpose:** Wrap Gemini API errors for consistent handling

**Fields:**
```python
@dataclass
class GeminiAPIError(Exception):
    message: str
    status_code: int | None
    error_code: str | None
    retry_after: int | None  # Seconds until retry (for rate limiting)
    is_retryable: bool       # Whether error should trigger retry logic
```

**Common Error Codes:**
- `400`: Invalid request (bad input, malformed prompt)
- `401`: Authentication failure (invalid API key)
- `403`: Permission denied (quota exceeded, region restricted)
- `404`: Model not found
- `429`: Rate limit exceeded (free tier: 10 RPM)
- `500`: Server error (transient, retryable)
- `503`: Service unavailable (transient, retryable)

---

## State Transitions

### Enrichment Workflow (Unchanged)

```
pending → processing → completed (success)
                    → failed (error)
```

**No Changes:** Gemini maintains the same workflow states as Ollama.

---

## Migration Considerations

### Data Preservation

**Requirement:** All existing Ollama-enriched tasks must remain accessible after migration.

**Strategy:**
- No database schema changes required
- Existing `enriched_text` and metadata remain valid
- New tasks use Gemini API
- Old tasks keep Ollama-generated content (immutable)

**Validation:**
```sql
-- All existing tasks remain accessible
SELECT COUNT(*) FROM tasks WHERE enriched_text IS NOT NULL;

-- Workbench state preserved
SELECT COUNT(*) FROM workbench WHERE enrichment_status = 'completed';
```

---

## Summary

This feature introduces NO new database entities. All changes are confined to:

1. **New Python data structures** (in-memory):
   - `GeminiClientConfig` (client configuration)
   - `GeminiAPIError` (error handling)

2. **Reused existing entities**:
   - Task (no changes)
   - Workbench (no changes)
   - MetadataExtractionResponse (enhanced with Pydantic native support)

3. **Data flow remains identical**:
   - User input → LLM enrichment → metadata extraction → database persistence
   - Only the LLM provider changes (Ollama → Gemini)

This architecture ensures **zero-downtime migration** and **100% feature parity** with the existing Ollama integration.
