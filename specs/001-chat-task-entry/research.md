# Research & Technology Decisions

**Feature**: Chat-Based Task Entry
**Date**: 2025-11-04
**Status**: Complete

## Executive Summary

This document captures the technology stack decisions for implementing the chat-based task entry feature. All choices prioritize simplicity, async-first architecture, and adherence to the TaskMaster constitution (library-first, TDD, clean architecture).

## Technology Stack Decisions

### Backend Language & Framework

**Decision**: Python 3.11+ with FastAPI

**Rationale**:
- **Async-first**: FastAPI has native `async`/`await` support and built-in `BackgroundTasks` for non-blocking task enrichment
- **Performance**: FastAPI is one of the fastest Python frameworks, meeting the <100ms response time requirement
- **Ollama Integration**: Ollama provides official Python client (`openai` library compatible) with simple async patterns
- **Developer Experience**: Automatic OpenAPI documentation, type safety with Pydantic, minimal boilerplate
- **Testing**: Excellent testing ecosystem with pytest and async test support

**Alternatives Considered**:
- **TypeScript/Node.js with Express**: Considered for unified language with frontend, but Python has better Ollama integration and ML ecosystem
- **Go with Gin**: Better raw performance, but lacks mature Ollama SDKs and async patterns are more verbose

**Key Dependencies**:
- `fastapi>=0.115.0` - Web framework
- `openai>=1.0.0` - Ollama client (OpenAI-compatible API)
- `sqlalchemy>=2.0` - ORM for task persistence
- `uvicorn` - ASGI server
- `pytest` + `pytest-asyncio` - Testing framework

**Context7 Research**: FastAPI documentation (22,734+ code snippets, trust score 9.0) confirms robust async patterns with `BackgroundTasks`, WebSocket support for real-time updates, and extensive production usage.

---

### Frontend Framework

**Decision**: React 18+ with TypeScript and Vite

**Rationale**:
- **Component Library Compatibility**: shadcn/ui (constitutional requirement) is designed for React with TypeScript
- **Async State Management**: React 18 Suspense and `useActionState` provide built-in loading state handling
- **Type Safety**: TypeScript ensures API contract adherence between frontend and backend
- **Developer Experience**: Vite provides instant HMR and fast builds (<30s startup requirement)
- **Testing**: Jest/Vitest with React Testing Library for component tests

**Alternatives Considered**:
- **Vue 3 with shadcn-vue**: Vue port of shadcn/ui exists, but has fewer code examples (469 vs 1,251 snippets) and smaller community
- **Svelte with shadcn-svelte**: Lighter runtime, but fewer production examples and team unfamiliarity

**Key Dependencies**:
- `react>=18.0` + `react-dom` - UI framework
- `typescript>=5.0` - Type safety
- `vite` - Build tool
- `@tanstack/react-query` - Async state management for task polling/updates
- `vitest` + `@testing-library/react` - Testing

**Context7 Research**: shadcn/ui documentation (1,251 code snippets, trust score 10.0) shows extensive React patterns with Skeleton components for loading states, Input components for chat, and form handling.

---

### UI Component Library

**Decision**: shadcn/ui (constitutional requirement)

**Rationale**:
- **Constitution Mandate**: Technology Standards section requires shadcn/ui for all UI development
- **Accessibility**: Built on Radix UI primitives, ensuring WCAG compliance
- **Customization**: Copy-paste approach allows full control over component code
- **Loading States**: Built-in `Skeleton` components for async enrichment feedback
- **Form Handling**: Comprehensive form components with validation support

**Key Components for This Feature**:
- `Input` - Chat message input field
- `Button` - Send button
- `Card` - Task list items
- `Skeleton` - Loading indicators during enrichment
- `ScrollArea` - Chat history scrolling
- `Badge` - Task status indicators

**Context7 Research**: Documentation confirms React Suspense integration patterns and loading state best practices using Skeleton components.

---

### LLM Integration

**Decision**: Ollama with OpenAI-compatible Python client

**Rationale**:
- **Local-first**: Meets "offline-capable" constraint (except LLM calls)
- **OpenAI Compatibility**: Use standard `openai` Python library pointing to `localhost:11434/v1/`
- **Async Support**: Native async client for non-blocking enrichment
- **No API Keys**: Local deployment requires dummy API key only
- **Model Flexibility**: Users can choose any Ollama model (llama3.2, mistral, etc.)

**Implementation Pattern**:
```python
from openai import OpenAI

client = OpenAI(
    base_url='http://localhost:11434/v1/',
    api_key='ollama'  # required but ignored
)

# Async enrichment
async def enrich_task(user_input: str) -> str:
    response = await client.chat.completions.create(
        model='llama3.2',
        messages=[{
            'role': 'user',
            'content': f'Fix spelling and improve wording: {user_input}'
        }],
        temperature=0.3  # Lower temperature for consistent corrections
    )
    return response.choices[0].message.content
```

**Alternatives Considered**:
- **Direct Ollama REST API**: More control but requires manual request handling
- **LangChain**: Adds unnecessary abstraction layer for simple enrichment task

**Context7 Research**: Ollama documentation (319 code snippets, trust score 7.5) shows simple async patterns with OpenAI client library.

---

### Async Task Processing

**Decision**: FastAPI BackgroundTasks + In-Memory Queue

**Rationale**:
- **Built-in Solution**: FastAPI's `BackgroundTasks` runs tasks after response is sent
- **Simplicity**: No external dependencies (Redis, Celery) for single-user local deployment
- **Performance**: Meets requirements (5+ concurrent enrichments, <3s per task)
- **Status Updates**: Frontend polls GET /tasks endpoint while enrichment in progress

**Implementation Pattern**:
```python
from fastapi import BackgroundTasks
import asyncio

# In-memory queue for tracking enrichment status
enrichment_queue: dict[str, str] = {}  # task_id -> status

async def enrich_task_background(task_id: str, user_input: str):
    enrichment_queue[task_id] = "processing"
    try:
        enriched_text = await enrich_task(user_input)
        # Update task in database
        enrichment_queue[task_id] = "completed"
        # Frontend will detect via polling GET /tasks
    except Exception as e:
        enrichment_queue[task_id] = "failed"

@app.post("/tasks")
async def create_task(task: TaskCreate, background_tasks: BackgroundTasks):
    # Create task with placeholder
    task_id = create_task_in_db(task.user_input)
    # Schedule enrichment
    background_tasks.add_task(enrich_task_background, task_id, task.user_input)
    return {"task_id": task_id, "status": "enriching"}
```

**Alternatives Considered**:
- **Celery + Redis**: Overkill for single-user deployment, adds complexity and startup time
- **Python asyncio.Queue**: More manual management, BackgroundTasks simpler

**Context7 Research**: FastAPI BackgroundTasks documentation shows dependency injection support and multiple task queueing.

---

### Real-Time Updates

**Decision**: Simple Polling (GET /tasks endpoint)

**Rationale**:
- **Constitutional Simplicity**: No WebSocket connection management, heartbeats, or reconnection logic
- **Adequate Performance**: Enrichment takes 2-3s (SC-005); polling every 500ms adds ~250ms average latency (imperceptible)
- **Zero Infrastructure**: No connection state tracking, no active connection pool
- **Easier Testing**: Standard HTTP requests, no special WebSocket test infrastructure
- **Single-User Optimal**: Polling overhead negligible for local single-user deployment

**Implementation Pattern**:
```typescript
// Frontend: Poll while tasks are enriching
function useTaskPolling() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: (data) => {
      // Poll every 500ms if any tasks are pending/processing
      const hasEnriching = data?.some(t =>
        ['pending', 'processing'].includes(t.enrichment_status)
      );
      return hasEnriching ? 500 : false; // Stop polling when all complete
    }
  });
  return tasks;
}
```

**Backend**: No changes needed - existing GET /tasks endpoint handles everything

**Performance Analysis**:
- **Polling overhead**: 1 request every 500ms = 2 req/s
- **During burst** (5 tasks enriching for 3s): ~6 requests total
- **Network payload**: ~2KB per response (100 tasks)
- **User perception**: No difference between 2.0s (push) vs 2.3s (poll) when enrichment is 2-3s

**Alternatives Considered**:
- **WebSocket**: Rejected - violates constitution's simplicity principle (complex connection management for imperceptible benefit)
- **Server-Sent Events (SSE)**: Still requires server state management, no simpler than polling
- **Long polling**: Adds server complexity, no benefit over simple polling for this latency

**Why Polling Wins**:
1. **Complexity**: ~50 lines of code vs ~300 for WebSocket (client + server)
2. **Edge cases**: Zero vs many (disconnect, reconnect, stale connections, heartbeat failures)
3. **Testing**: Standard HTTP contract tests vs WebSocket-specific test infrastructure
4. **User impact**: None - enrichment latency (2-3s) dwarfs polling latency (250ms avg)

---

### Data Persistence

**Decision**: SQLite with SQLAlchemy 2.0

**Rationale**:
- **Zero Configuration**: SQLite requires no separate database server (meets <30s startup requirement)
- **Single-User Optimal**: Perfect for local deployment, no concurrent write concerns
- **Portability**: Single file database, easy backup and migration
- **SQLAlchemy 2.0**: Modern async support, type-safe queries, migration tools (Alembic)
- **Testing**: In-memory SQLite for fast test execution

**Schema Design**:
```python
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.ext.asyncio import AsyncSession

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    user_input = Column(Text, nullable=False)  # Original message
    enriched_text = Column(Text, nullable=True)  # LLM-improved version
    status = Column(String, default="open")  # Always "open" for this feature
    enrichment_status = Column(String, default="pending")  # pending/processing/completed/failed
    created_at = Column(DateTime, nullable=False)
```

**Alternatives Considered**:
- **PostgreSQL**: Better for multi-user, but requires Docker service, adds startup time
- **JSON files**: Simpler but no query capabilities, no ACID guarantees

---

### Docker Containerization

**Decision**: Multi-stage Dockerfile + docker-compose

**Rationale**:
- **Single Command Startup**: `docker-compose up` meets FR-021 requirement
- **Cross-Platform**: Works identically on Linux/macOS/Windows (FR-023)
- **Dependency Isolation**: Ollama, Python, Node all containerized
- **Production-Ready**: Layer caching for fast rebuilds

**Architecture**:
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama

  backend:
    build: ./backend
    depends_on: [ollama]
    environment:
      OLLAMA_BASE_URL: http://ollama:11434

  frontend:
    build: ./frontend
    depends_on: [backend]
    ports:
      - "3000:80"
```

**Startup Optimization**:
- Pre-pull Ollama model in Dockerfile (add ~2GB to image but eliminates first-run delay)
- Multi-stage builds to minimize image size
- Health checks to ensure services ready before accepting requests

**Alternatives Considered**:
- **Separate installs**: Violates FR-020 (minimal configuration) and FR-023 (cross-platform consistency)
- **Kubernetes**: Massive overkill for single-user local deployment

---

## Testing Strategy

### Unit Tests
- **Backend**: pytest for service logic, enrichment functions, task queue
- **Frontend**: Vitest for React components, state management

### Integration Tests
- **API Contracts**: Test FastAPI endpoints with TestClient
- **Database**: Test SQLAlchemy models with in-memory SQLite
- **Ollama Integration**: Mock Ollama responses for deterministic tests

### Contract Tests
- **OpenAPI Schema**: Generate TypeScript types from FastAPI schema
- **Validate Requests**: Ensure frontend sends correct payload structure
- **Validate Responses**: Ensure backend returns expected formats

### E2E Tests (Future)
- Playwright for full workflow: submit task → enrichment → list update

---

## Performance Validation

| Requirement | Target | Implementation Strategy |
|-------------|--------|------------------------|
| SC-001: Input ready time | <100ms | React controlled component, optimistic updates |
| SC-004: Loading state | <100ms | Skeleton components render immediately on submit |
| SC-005: Enrichment time | <3s | Ollama llama3.2 model, low temperature for speed |
| SC-008: Rapid submission | 5 tasks <10s | BackgroundTasks queuing, WebSocket for updates |
| SC-012: Startup time | <30s | Docker pre-built images, SQLite auto-init |

---

## Security Considerations

- **No Authentication**: Single-user local deployment per spec assumptions
- **Input Validation**: Sanitize user input before LLM enrichment (prevent prompt injection)
- **CORS**: Frontend-backend on different ports requires CORS configuration
- **Rate Limiting**: Not required for single-user, but add to prevent accidental Ollama overload

---

## Migration & Future Considerations

### Future Enhancements (Not in Scope)
- **Multi-user support**: Add authentication, per-user task isolation
- **Cloud deployment**: Replace SQLite with PostgreSQL, add Ollama API key support for cloud LLMs
- **Task editing/deletion**: Add PATCH/DELETE endpoints (FR out of scope)
- **Metadata extraction**: Extend enrichment to extract dates, people, projects

### Technical Debt to Monitor
- **In-memory enrichment queue**: Doesn't survive server restart. Acceptable for MVP, but add Redis for production
- **WebSocket scalability**: Single connection OK for single-user, but need pub/sub for multi-user
- **Ollama model management**: Hardcoded model name, should be configurable

---

## Conclusion

All technical unknowns from the Technical Context have been resolved:

| Original Unknown | Resolution |
|------------------|------------|
| Backend language | Python 3.11+ |
| Web framework | FastAPI |
| Frontend framework | React 18 + TypeScript |
| React UI library | shadcn/ui |
| Ollama client | OpenAI Python library |
| Async task queue | FastAPI BackgroundTasks |
| Storage | SQLite + SQLAlchemy 2.0 |
| Testing | pytest (backend), Vitest (frontend) |

Next steps: Proceed to Phase 1 (data model, API contracts, quickstart guide).
