# Architecture: Gemini LLM Integration

## Overview

This document provides visual architecture diagrams for replacing the Ollama local LLM with Google's Gemini API. All diagrams use Mermaid format for consistency and renderability.

---

## System Integration Diagram

### Before: Ollama Architecture

```mermaid
graph TB
    subgraph "Frontend Container"
        UI[React UI]
    end

    subgraph "Backend Container"
        API[FastAPI Backend]
        ES[Enrichment Service]
        ME[Metadata Extractor]
        OC[Ollama Client]
    end

    subgraph "Ollama Container"
        OLL[Ollama Server]
        MODEL[llama3.2 Model<br/>~4GB]
    end

    subgraph "Volumes"
        DB[(SQLite DB)]
        VOL[Ollama Models<br/>Volume]
    end

    UI -->|POST /tasks| API
    API -->|Async Queue| ES
    ES -->|Extract| ME
    ME -->|LLM Call| OC
    OC -->|HTTP| OLL
    OLL -->|Load| MODEL
    MODEL -.->|Persist| VOL
    ES -->|Save| DB

    style OLL fill:#f96
    style MODEL fill:#f96
    style VOL fill:#f96
```

### After: Gemini Architecture

```mermaid
graph TB
    subgraph "Frontend Container"
        UI[React UI]
    end

    subgraph "Backend Container"
        API[FastAPI Backend]
        ES[Enrichment Service]
        ME[Metadata Extractor]
        GC[Gemini Client]
    end

    subgraph "Google Cloud"
        GAPI[Gemini API<br/>gemini-2.5-flash]
    end

    subgraph "Volumes"
        DB[(SQLite DB)]
    end

    UI -->|POST /tasks| API
    API -->|Async Queue| ES
    ES -->|Extract| ME
    ME -->|LLM Call| GC
    GC -->|HTTPS + API Key| GAPI
    ES -->|Save| DB

    style GC fill:#9f9
    style GAPI fill:#9f9
```

**Key Changes:**
- ❌ **Removed:** Ollama container, model volume, local inference
- ✅ **Added:** Gemini client library, cloud API integration
- ✅ **Simplified:** No Docker volumes, no model downloads, no GPU requirements

---

## Sequence Diagram: Enrichment Flow with Gemini

```mermaid
sequenceDiagram
    participant User
    participant API as FastAPI
    participant ES as Enrichment Service
    participant ME as Metadata Extractor
    participant GC as Gemini Client
    participant GAPI as Gemini API

    User->>API: POST /tasks {"user_input": "call John tmrw"}
    activate API

    API->>DB: Create Task (status: pending)
    API->>Workbench: Create entry (enrichment_status: pending)
    API-->>User: 201 Created {"id": "abc123"}
    deactivate API

    Note over ES: Background async task

    ES->>Workbench: Update (enrichment_status: processing)

    ES->>ME: extract_metadata("call John tmrw")
    activate ME

    ME->>GC: enrich_task("call John tmrw")
    activate GC

    GC->>GAPI: POST /generateContent
    Note right of GC: Headers: x-goog-api-key<br/>Model: gemini-2.5-flash<br/>Temp: 0.3, Max Tokens: 100

    GAPI-->>GC: "Call John tomorrow"
    deactivate GC

    ME->>GC: extract("Call John tomorrow")
    activate GC

    GC->>GAPI: POST /generateContent (with Pydantic schema)
    Note right of GC: response_mime_type: application/json<br/>response_schema: MetadataExtractionResponse

    GAPI-->>GC: {persons: ["John"], deadline: "tomorrow", ...}
    GC-->>ME: MetadataExtractionResponse (parsed)
    deactivate GC
    deactivate ME

    ES->>DB: Update Task (enriched_text, metadata)
    ES->>Workbench: Update (enrichment_status: completed)

    Note over User: Frontend polls /tasks/workbench<br/>sees completed task
```

**Timing Expectations:**
- Enrichment: 0.5-1.5s (avg 1s)
- Metadata extraction: 0.5-1.5s (avg 1s)
- **Total**: 1-3s (avg 2s) - matches/improves Ollama

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant App as Backend Application
    participant GC as Gemini Client
    participant ENV as Environment
    participant GAPI as Gemini API

    App->>ENV: os.getenv("GEMINI_API_KEY")
    ENV-->>App: "AIzaSy..."

    App->>GC: GeminiClient(api_key="AIzaSy...")
    Note over GC: Stores API key securely<br/>in client instance

    GC->>GC: validate_api_key()
    alt Valid API Key Format
        GC-->>App: Client ready
    else Invalid Format
        GC-->>App: ValueError("Invalid API key format")
    end

    Note over App: On first LLM call

    App->>GC: enrich_task("...")
    GC->>GAPI: POST /v1beta/models/gemini-2.5-flash:generateContent
    Note right of GC: Header: x-goog-api-key: AIzaSy...

    alt Authentication Success
        GAPI-->>GC: 200 OK + response
        GC-->>App: Enriched text
    else Authentication Failure
        GAPI-->>GC: 401 Unauthorized
        GC-->>App: GeminiAPIError(status=401)
        App->>Workbench: Mark failed with error message
    end
```

**Environment Variables:**
```bash
# Required
GEMINI_API_KEY=AIzaSy...  # Get from https://aistudio.google.com/

# Optional (with defaults)
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT=15.0
GEMINI_MAX_RETRIES=3
```

---

## Error Handling and Retry Logic

```mermaid
graph TB
    START[LLM API Call]

    START --> CALL{Execute Request}

    CALL -->|Success| SUCCESS[Return Response]
    CALL -->|Error| CHECK{Check Error Type}

    CHECK -->|400 Bad Request| FAIL[Mark Failed<br/>No Retry]
    CHECK -->|401 Unauthorized| FAIL
    CHECK -->|404 Not Found| FAIL
    CHECK -->|429 Rate Limit| RETRY{Retries Left?}
    CHECK -->|500 Server Error| RETRY
    CHECK -->|503 Unavailable| RETRY
    CHECK -->|Timeout| RETRY

    RETRY -->|Yes| BACKOFF[Exponential Backoff<br/>wait = base * 2^attempt]
    RETRY -->|No| FAIL

    BACKOFF --> CALL

    FAIL --> LOG[Log Error]
    LOG --> WORKBENCH[Update Workbench<br/>enrichment_status: failed<br/>error_message: details]

    SUCCESS --> WORKBENCH_OK[Update Workbench<br/>enrichment_status: completed]

    style FAIL fill:#f96
    style SUCCESS fill:#9f9
    style BACKOFF fill:#ff9
```

**Retry Configuration:**
```python
# Exponential backoff with jitter
retry_options = HttpRetryOptions(
    max_retries=3,
    initial_backoff=1.0,    # 1 second
    max_backoff=60.0,       # 60 seconds
    backoff_multiplier=2.0,  # Exponential (1s, 2s, 4s)
    jitter=True             # Add randomness to prevent thundering herd
)
```

**Error Messages to User:**
- 401: "Gemini API authentication failed. Please check your API key."
- 429: "Rate limit exceeded. Task will retry automatically."
- 500/503: "Gemini service temporarily unavailable. Retrying..."
- Timeout: "Gemini API timeout. Task will retry."
- Other: "Enrichment failed: {error_message}"

---

## Component Interaction Diagram

```mermaid
graph TB
    subgraph "API Layer"
        ROUTES[tasks.py Routes]
    end

    subgraph "Service Layer"
        ES[Enrichment Service]
        ME[Metadata Extractor]
    end

    subgraph "LLM Client Layer (NEW)"
        GC[Gemini Client]
        EC[Error Handler]
        RC[Retry Logic]
    end

    subgraph "External"
        GAPI[Gemini API]
    end

    subgraph "Data Layer"
        TASK[Task Model]
        WB[Workbench Model]
    end

    ROUTES -->|Create Task| ES
    ES -->|Update Status| WB
    ES -->|Enrich Text| ME
    ME -->|LLM Call| GC

    GC -->|API Request| GAPI
    GAPI -.->|Error| EC
    EC -->|Retry?| RC
    RC -->|Yes| GC
    RC -->|No| ES

    GAPI -->|Response| GC
    GC -->|Parsed Data| ME
    ME -->|Metadata| ES
    ES -->|Save| TASK

    style GC fill:#9f9
    style EC fill:#ff9
    style RC fill:#ff9
```

**Dependency Flow:**
```
routes.tasks → enrichment_service
enrichment_service → metadata_extraction
metadata_extraction → gemini_client
gemini_client → google.genai (external SDK)
```

**Key Interfaces:**
1. `GeminiClient.enrich_task(text: str) → str`
2. `GeminiClient.extract_metadata(text: str, schema: Type[BaseModel]) → BaseModel`
3. `MetadataExtractor.extract(task_text: str) → MetadataExtractionResponse`

---

## Deployment Changes

### Docker Compose Modification

```mermaid
graph LR
    subgraph "docker-compose.yml (BEFORE)"
        B_BACKEND[Backend Container]
        B_FRONTEND[Frontend Container]
        B_OLLAMA[Ollama Container<br/>TO REMOVE]
        B_INIT[Ollama Init Container<br/>TO REMOVE]

        B_VOL_DB[(db_data volume)]
        B_VOL_OLL[(ollama_data volume<br/>TO REMOVE)]
    end

    subgraph "docker-compose.yml (AFTER)"
        A_BACKEND[Backend Container<br/>+ GEMINI_API_KEY env]
        A_FRONTEND[Frontend Container<br/>UNCHANGED]

        A_VOL_DB[(db_data volume)]
    end

    style B_OLLAMA fill:#f96
    style B_INIT fill:#f96
    style B_VOL_OLL fill:#f96
```

**Changes:**
```yaml
# REMOVE these services
services:
  ollama:        # DELETE entire service
  ollama-init:   # DELETE entire service

# REMOVE this volume
volumes:
  ollama_data:   # DELETE entire volume

# UPDATE backend service
services:
  backend:
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}  # ADD
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.5-flash}  # ADD
      # REMOVE: OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
```

---

## Configuration Flow

```mermaid
graph TB
    START[Application Startup]

    START --> LOAD{Load .env}

    LOAD -->|Development| DEV[.env.development<br/>GEMINI_API_KEY=test_key]
    LOAD -->|Production| PROD[.env.production<br/>GEMINI_API_KEY=real_key]

    DEV --> INIT
    PROD --> INIT

    INIT[Initialize Gemini Client]

    INIT --> VALIDATE{Validate Config}

    VALIDATE -->|API Key Missing| FAIL[Fail Fast<br/>ValueError]
    VALIDATE -->|Invalid Model| FAIL
    VALIDATE -->|Valid| CREATE[Create Client Instance]

    CREATE --> TEST[Test API Connection<br/>Simple ping request]

    TEST -->|Success| READY[Service Ready]
    TEST -->|Failure| LOG[Log Warning<br/>Service starts anyway]

    LOG --> READY

    READY --> HEALTH[Health Check Endpoint<br/>/health returns 200]

    style FAIL fill:#f96
    style READY fill:#9f9
```

**Startup Validation:**
```python
# backend/src/lib/gemini_client.py

def validate_config(config: GeminiClientConfig) -> None:
    """Validate Gemini client configuration at startup."""
    if not config.api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is required. "
            "Get your API key from https://aistudio.google.com/"
        )

    if not config.api_key.startswith("AIza"):
        raise ValueError("Invalid Gemini API key format")

    supported_models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-exp"]
    if config.model not in supported_models:
        raise ValueError(f"Unsupported model: {config.model}")
```

---

## Migration Strategy Diagram

```mermaid
graph TB
    START[Current System<br/>Ollama-based]

    START --> BACKUP[Backup Database<br/>Preserve existing tasks]

    BACKUP --> CODE[Update Code<br/>1. Add gemini_client.py<br/>2. Update services<br/>3. Update docker-compose]

    CODE --> ENV[Configure Environment<br/>Add GEMINI_API_KEY]

    ENV --> TEST_LOCAL[Test Locally<br/>Verify enrichment works]

    TEST_LOCAL -->|Pass| DEPLOY[Deploy to Production]
    TEST_LOCAL -->|Fail| DEBUG[Debug & Fix]
    DEBUG --> TEST_LOCAL

    DEPLOY --> VERIFY{Verify Migration}

    VERIFY -->|Check 1| OLD[Old Tasks Accessible?]
    VERIFY -->|Check 2| NEW[New Tasks Enriched?]
    VERIFY -->|Check 3| DOCKER[Ollama Container Removed?]

    OLD -->|✅| CHECK1_OK
    NEW -->|✅| CHECK2_OK
    DOCKER -->|✅| CHECK3_OK

    CHECK1_OK --> COMPLETE
    CHECK2_OK --> COMPLETE
    CHECK3_OK --> COMPLETE[Migration Complete]

    OLD -->|❌| ROLLBACK[Rollback to Ollama]
    NEW -->|❌| ROLLBACK
    DOCKER -->|❌| WARN[Warning: Cleanup needed]

    style COMPLETE fill:#9f9
    style ROLLBACK fill:#f96
```

**Migration Checklist:**
1. ✅ Existing tasks remain accessible (no data loss)
2. ✅ New tasks use Gemini API
3. ✅ Enrichment latency ≤ Ollama performance
4. ✅ Error handling works (rate limits, timeouts)
5. ✅ Ollama containers removed from docker-compose
6. ✅ Ollama volumes can be safely deleted
7. ✅ API costs within budget ($0.60/month estimated)

---

## Summary

This architecture provides:

1. **Clean separation**: LLM client abstraction isolates Gemini SDK
2. **Zero downtime**: Existing tasks preserved, new tasks use Gemini
3. **Robust error handling**: Exponential backoff, clear error messages
4. **Simplified deployment**: No Docker volumes, no model downloads
5. **Cost monitoring**: API usage logged for cost tracking
6. **Feature parity**: Same enrichment capabilities as Ollama

**Next Steps:** Proceed to `/speckit.tasks` to generate implementation tasks.
