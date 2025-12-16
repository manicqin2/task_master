# Architecture: Task Metadata Extraction

**Feature**: 004-task-metadata-extraction
**Created**: 2025-11-05
**Related**: [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/metadata-extraction.yaml](./contracts/metadata-extraction.yaml)

## Overview

This document provides visual diagrams and architectural documentation for the Task Metadata Extraction feature. It covers the system flow, component interactions, data flow, and state transitions using Mermaid diagrams.

---

## 1. System Architecture Overview

### Component Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (React)"]
        UI[User Interface]
        TaskCard[Task Card Components]
        NeedAttention[Need Attention Lane]
        MetadataDisplay[Metadata Display]
        DebugPanel[Debug Panel]
    end

    subgraph Backend["Backend (FastAPI)"]
        API[API Endpoints]
        TaskService[Task Service]
        EnrichmentService[Enrichment Service]
        MetadataExtractor[Metadata Extractor]
        DateParser[Date Parser]
        Cache[Redis Cache]
    end

    subgraph Storage["Data Layer"]
        DB[(SQLite Database)]
        TaskTable[Tasks Table]
    end

    subgraph External["External Services"]
        LLM[LLM Service<br/>Ollama/OpenAI]
    end

    UI --> |POST /api/tasks| API
    UI --> |GET /api/tasks/:id| API
    UI --> |PATCH /api/tasks/:id/metadata| API

    API --> TaskService
    TaskService --> DB
    TaskService --> |Queue Background| EnrichmentService

    EnrichmentService --> MetadataExtractor
    MetadataExtractor --> |Check Cache| Cache
    MetadataExtractor --> |Extract| LLM
    MetadataExtractor --> DateParser

    EnrichmentService --> TaskTable

    TaskCard --> MetadataDisplay
    NeedAttention --> MetadataDisplay
    DebugPanel --> |GET /api/tasks/:id/metadata/debug| API

    style MetadataExtractor fill:#e1f5ff
    style LLM fill:#ffe1e1
    style Cache fill:#fff4e1
```

**Key Components**:
- **Metadata Extractor**: Core library for extracting structured metadata using LLM
- **Date Parser**: Utility for parsing relative dates ("tomorrow", "next week") to absolute datetimes
- **Redis Cache**: Caches LLM responses to avoid duplicate extractions
- **Need Attention Lane**: UI component for tasks requiring user input

---

## 2. Task Creation & Extraction Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant TaskService
    participant DB
    participant EnrichmentService
    participant MetadataExtractor
    participant Cache
    participant LLM

    User->>Frontend: Enter task description
    Frontend->>API: POST /api/tasks<br/>{user_input: "Call Sarah tomorrow..."}

    API->>TaskService: create_task(user_input)
    TaskService->>DB: INSERT Task<br/>(enrichment_status=pending)
    DB-->>TaskService: task_id

    API->>EnrichmentService: Queue BackgroundTask<br/>(task_id, user_input)
    API-->>Frontend: 201 Created<br/>{id: task_id, status: "created"}

    Frontend->>User: Show task created<br/>(metadata pending)

    Note over EnrichmentService: Background processing starts

    EnrichmentService->>MetadataExtractor: extract_metadata(user_input)

    MetadataExtractor->>Cache: Check cache<br/>(SHA256 hash of input)

    alt Cache Hit
        Cache-->>MetadataExtractor: Cached metadata
    else Cache Miss
        MetadataExtractor->>LLM: Structured Output Request<br/>(Pydantic schema)
        LLM-->>MetadataExtractor: MetadataExtractionResponse<br/>(with confidence scores)
        MetadataExtractor->>Cache: Store (TTL: 1 hour)
    end

    MetadataExtractor->>MetadataExtractor: Parse deadline<br/>(dateutil)
    MetadataExtractor->>MetadataExtractor: Apply confidence<br/>thresholds (0.7)

    MetadataExtractor-->>EnrichmentService: TaskMetadata

    EnrichmentService->>DB: UPDATE Task<br/>(metadata fields + suggestions)

    Note over Frontend: Polling (500ms interval)
    Frontend->>API: GET /api/tasks/:id
    API->>TaskService: get_task(id)
    TaskService->>DB: SELECT Task
    DB-->>TaskService: Task with metadata
    TaskService-->>API: TaskResponse
    API-->>Frontend: 200 OK<br/>(with metadata)

    Frontend->>User: Display task card<br/>with metadata badges
```

**Key Points**:
- Task creation returns immediately (non-blocking)
- Metadata extraction happens asynchronously in background
- Frontend polls for metadata updates (reuses Feature 001 polling)
- Redis cache prevents duplicate LLM calls for identical inputs

---

## 3. State Transition Diagram

### Task Metadata States

```mermaid
stateDiagram-v2
    [*] --> Created: POST /api/tasks

    Created --> Extracting: Background task starts

    Extracting --> Complete: All fields confidence >= 0.7
    Extracting --> NeedsAttention: Any field confidence < 0.7
    Extracting --> Failed: LLM timeout or error

    NeedsAttention --> UserReview: Display in Need Attention lane
    UserReview --> Confirmed: User accepts/edits suggestions<br/>(PATCH /metadata)

    Complete --> [*]: Task ready to use
    Confirmed --> [*]: Task ready to use
    Failed --> [*]: Task usable without metadata

    note right of Extracting
        - Check Redis cache
        - Call LLM with Structured Outputs
        - Parse deadline with dateutil
        - Apply confidence thresholds
    end note

    note right of NeedsAttention
        requires_attention = true
        metadata_suggestions contains
        low-confidence fields
    end note
```

**State Definitions**:
- **Created**: Task created, metadata extraction queued
- **Extracting**: Background task processing (LLM call in progress)
- **Complete**: All metadata fields auto-populated (confidence >= 0.7)
- **NeedsAttention**: One or more fields require user confirmation
- **Confirmed**: User has reviewed and confirmed metadata
- **Failed**: Extraction failed (timeout/error), task still usable without metadata

---

## 4. Data Flow Diagram

### Metadata Extraction Pipeline

```mermaid
flowchart LR
    A[User Input Text] --> B{Check Cache}
    B -->|Hit| C[Cached Metadata]
    B -->|Miss| D[LLM Extraction]

    D --> E[MetadataExtractionResponse<br/>with confidence scores]
    E --> F[Parse Deadline<br/>dateutil]
    E --> G[Extract Person Names]
    E --> H[Extract Project]
    E --> I[Extract Type & Priority]

    F --> J{deadline_confidence<br/>>= 0.7?}
    G --> K{persons_confidence<br/>>= 0.7?}
    H --> L{project_confidence<br/>>= 0.7?}
    I --> M{type/priority_confidence<br/>>= 0.7?}

    J -->|Yes| N[deadline_parsed]
    J -->|No| O[suggestion only]

    K -->|Yes| P[persons array]
    K -->|No| O

    L -->|Yes| Q[project field]
    L -->|No| O

    M -->|Yes| R[type/priority fields]
    M -->|No| O

    N --> S[Task.metadata]
    P --> S
    Q --> S
    R --> S
    O --> T[Task.metadata_suggestions<br/>JSON]

    S --> U{Any field<br/>confidence < 0.7?}
    U -->|Yes| V[requires_attention = true]
    U -->|No| W[requires_attention = false]

    V --> X[Need Attention Lane]
    W --> Y[Complete Lane]

    C --> F

    style D fill:#e1f5ff
    style X fill:#ffe1e1
    style Y fill:#e1ffe1
```

**Confidence Threshold Logic**:
- **>= 0.7**: Auto-populate field, user can edit
- **0.4-0.69**: Show as suggestion in Need Attention lane
- **< 0.4**: Hide suggestion, show empty field

---

## 5. Need Attention Lane Workflow

### User Interaction Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant NeedAttentionLane
    participant TaskCard
    participant API
    participant DB

    Frontend->>NeedAttentionLane: Poll tasks<br/>(requires_attention=true)
    NeedAttentionLane->>Frontend: Display tasks

    User->>TaskCard: View task with<br/>missing/ambiguous fields
    TaskCard->>TaskCard: Parse metadata_suggestions<br/>(JSON)
    TaskCard->>User: Show suggestions<br/>with confidence scores

    User->>TaskCard: Select/Edit values<br/>(e.g., project="Work")

    TaskCard->>API: PATCH /api/tasks/:id/metadata<br/>{project: "Work", ...}
    API->>DB: UPDATE Task<br/>(set fields, requires_attention=false)
    DB-->>API: Success
    API-->>TaskCard: 200 OK<br/>(updated task)

    TaskCard->>Frontend: Move task to appropriate lane<br/>(Pending/Complete)
    Frontend->>User: Task updated
```

**UI Components**:
- **FieldPrompt**: Shows missing field with input box
- **SuggestedValues**: Dropdown with suggested values + confidence
- **AcceptButton**: Quick-accept all suggestions
- **EditButton**: Manually edit individual fields

---

## 6. Debug Mode Architecture

### Chain of Thought Visibility

```mermaid
graph TD
    A[Task Card] --> B{Debug Mode<br/>Enabled?}
    B -->|No| C[Standard Metadata Display]
    B -->|Yes| D[Show Debug Panel Button]

    D --> E[User Clicks Debug]
    E --> F[GET /api/tasks/:id/metadata/debug]

    F --> G[Fetch metadata_suggestions<br/>+ chain_of_thought]

    G --> H[Display Debug Panel]

    H --> I[Field-by-field breakdown]
    I --> J[Confidence Scores]
    I --> K[Chain of Thought Reasoning]
    I --> L[Alternatives Considered]
    I --> M[Extraction Time]
    I --> N[LLM Model Used]

    style H fill:#fff4e1
    style K fill:#e1f5ff
```

**Debug Panel Information**:
- Per-field confidence scores
- LLM reasoning process (chain of thought)
- Alternative values considered and why rejected
- Extraction performance metrics (time, model)

---

## 7. Caching Strategy

### Redis Cache Flow

```mermaid
flowchart TB
    A[Task Input Text] --> B[Generate Cache Key<br/>SHA256 hash]

    B --> C{Cache Lookup<br/>GET key}

    C -->|Hit| D[Return Cached<br/>MetadataExtractionResponse]
    C -->|Miss| E[Call LLM]

    E --> F[MetadataExtractionResponse]
    F --> G[Cache Response<br/>SETEX key TTL=3600]
    G --> D

    D --> H[Parse & Apply Thresholds]

    I[Cache Eviction] -.->|After 1 hour| C

    style C fill:#fff4e1
    style D fill:#e1ffe1
    style E fill:#ffe1e1
```

**Cache Configuration**:
- **Key Format**: `metadata:{sha256(task_text)}`
- **TTL**: 3600 seconds (1 hour)
- **Eviction**: LRU (Least Recently Used)
- **Storage**: Redis (shared across backend instances)

**Benefits**:
- Prevents duplicate LLM calls for identical task descriptions
- Reduces extraction time from ~1000ms to <50ms (cache hit)
- Estimated 30% cache hit rate for typical usage

---

## 8. Error Handling and Resilience

### Failure Scenarios

```mermaid
flowchart TD
    A[Start Extraction] --> B{LLM Available?}

    B -->|No| C[Connection Error]
    B -->|Yes| D{Response < 5s?}

    D -->|No| E[Timeout]
    D -->|Yes| F{Valid JSON Schema?}

    F -->|No| G[Parsing Error]
    F -->|Yes| H{All Confidence<br/>Scores Present?}

    H -->|No| I[Incomplete Response]
    H -->|Yes| J[Success: Extract Metadata]

    C --> K[Log Error + Alert]
    E --> K
    G --> K
    I --> K

    K --> L[Store Task Without Metadata<br/>requires_attention=true]
    L --> M[User Can Manually Fill]

    J --> N[Store Task With Metadata]

    style K fill:#ffe1e1
    style N fill:#e1ffe1
```

**Graceful Degradation**:
- LLM timeout (>60s via OLLAMA_TIMEOUT): Task still created, metadata empty
- LLM error: Task created, user can manually enter metadata
- Cache failure: Fall back to LLM (no impact on extraction)
- Parsing error: Store raw response, mark for debug review

**Retry Strategy**:
- No automatic retries (avoid cascading failures)
- User can trigger re-extraction via "Retry" button (future feature)

---

## 9. Performance Optimization

### Async Processing Timeline

```mermaid
gantt
    title Metadata Extraction Performance
    dateFormat SSS
    axisFormat %L ms

    section User Experience
    POST /api/tasks (sync)     :done, a1, 000, 50ms
    Return task ID to frontend :milestone, m1, 050, 0ms
    Frontend polling starts    :done, a2, 050, 2000ms

    section Background Processing
    Queue background task      :done, b1, 050, 10ms
    Check Redis cache          :done, b2, 060, 20ms
    LLM extraction call        :active, b3, 080, 1000ms
    Parse deadline             :active, b4, 1080, 10ms
    Apply thresholds           :active, b5, 1090, 5ms
    Update database            :done, b6, 1095, 30ms

    section First Poll Result
    Frontend receives metadata :milestone, m2, 1125, 0ms
```

**Performance Targets**:
- API response time: <50ms (task creation)
- LLM extraction: <1500ms (95th percentile)
- Cache lookup: <20ms
- Total time to metadata: <2000ms (background)

**Bottlenecks**:
- LLM call: 500-1500ms (largest contributor)
- Date parsing: 5-10ms (negligible)
- Database update: 20-30ms (negligible)

---

## 10. Security Considerations

### Data Flow Security

```mermaid
flowchart LR
    A[User Input] --> B[Frontend Validation<br/>max 5000 chars]
    B --> C[API Validation<br/>Pydantic schema]
    C --> D[Sanitize for LLM<br/>no injection]
    D --> E[LLM Extraction]
    E --> F[Validate Response<br/>schema conformance]
    F --> G[Database Storage<br/>parameterized queries]

    H[Debug Mode Check] --> I{Admin or<br/>Debug Enabled?}
    I -->|No| J[403 Forbidden]
    I -->|Yes| K[Return Chain of Thought]

    style D fill:#fff4e1
    style F fill:#fff4e1
    style J fill:#ffe1e1
```

**Security Measures**:
1. **Input Validation**: Length limits, schema validation
2. **LLM Injection Prevention**: Sanitize user input before LLM prompts
3. **Output Validation**: Enforce Pydantic schema on LLM responses
4. **Access Control**: Debug endpoints restricted to admin users
5. **Data Privacy**: Chain of thought data not exposed to regular users

---

## 11. Deployment Architecture

### Docker Container Layout

```mermaid
graph TB
    subgraph Docker Compose
        Frontend[Frontend Container<br/>Node + Vite]
        Backend[Backend Container<br/>Python + FastAPI]
        Redis[Redis Container<br/>Cache]
        DB[SQLite<br/>Volume Mount]
        Ollama[Ollama Container<br/>LLM Service]
    end

    Frontend -.->|Port 5173| User[User Browser]
    User -.->|Port 5173| Frontend

    Frontend -->|HTTP| Backend
    Backend --> Redis
    Backend --> DB
    Backend -->|HTTP| Ollama

    style Frontend fill:#e1f5ff
    style Backend fill:#e1ffe1
    style Redis fill:#fff4e1
    style Ollama fill:#ffe1e1
```

**Configuration**:
- **Frontend**: Port 5173 (Vite dev server)
- **Backend**: Port 8000 (uvicorn)
- **Redis**: Port 6379 (internal)
- **Ollama**: Port 11434 (internal)
- **Database**: `/data/taskmaster.db` (volume)

---

## 12. Monitoring and Observability

### Key Metrics

```mermaid
graph LR
    A[Metrics Collection] --> B[Extraction Latency<br/>p50, p95, p99]
    A --> C[Cache Hit Rate<br/>%]
    A --> D[LLM Error Rate<br/>%]
    A --> E[Confidence Score<br/>Distribution]
    A --> F[Requires Attention<br/>Rate %]
    A --> G[User Confirmation<br/>Time]

    B --> H[Alerting<br/>>2s = Warning]
    D --> I[Alerting<br/>>5% = Critical]
    F --> J[Dashboard<br/>Track UX Quality]

    style H fill:#fff4e1
    style I fill:#ffe1e1
    style J fill:#e1f5ff
```

**Observability**:
- Log all extraction attempts (task_id, input_length, extraction_time, confidence_scores)
- Track cache hit/miss ratio
- Monitor LLM timeout frequency
- Measure user confirmation time in Need Attention lane

---

**Last Updated**: 2025-11-05
**Related Documents**: [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)
