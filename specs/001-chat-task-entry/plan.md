# Implementation Plan: Chat-Based Task Entry

**Branch**: `001-chat-task-entry` | **Date**: 2025-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-chat-task-entry/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a chat-based task entry interface where users can rapidly capture tasks through informal text input. Tasks are asynchronously enriched using local LLM (Ollama) to correct spelling and improve wording, then displayed in an open tasks list. The system must support non-blocking async enrichment, allowing users to submit multiple tasks without waiting. Deployment via Docker containers for cross-platform compatibility.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript + React 18 (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, OpenAI client (Ollama), shadcn/ui, @tanstack/react-query
**Storage**: SQLite with SQLAlchemy 2.0 (task persistence), in-memory React state (chat history)
**Testing**: pytest + pytest-asyncio (backend), Vitest + @testing-library/react (frontend)
**Target Platform**: Docker containers (Linux/macOS/Windows via Docker Desktop)
**Project Type**: web (frontend + backend architecture)
**Performance Goals**: <100ms UI response time, <3s per task enrichment, support 5+ concurrent enrichments
**Constraints**: Single-user local deployment, must work offline (except LLM calls), <30s startup time
**Scale/Scope**: Single user, ~100s of tasks, 2-3 screens (chat + task list)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Library-First Architecture

**Status**: ✅ COMPLIANT

**Analysis**: Feature will be implemented as modular libraries:
- Task enrichment library (Ollama LLM integration)
- Task storage library (persistence layer)
- Chat UI component library (React components)
- Async task queue library (background processing)

Each library has a clear, singular purpose and can be tested independently.

### II. Test-Driven Development

**Status**: ✅ COMPLIANT

**Requirements**:
- [ ] Contract tests for library APIs (task queue, storage, enrichment)
- [ ] Integration tests for frontend-backend communication
- [ ] Unit tests for business logic (enrichment, task ordering, async handling)
- [ ] Tests MUST be written and reviewed before implementation begins

**TDD Workflow**: Red-Green-Refactor cycle enforced throughout implementation.

### III. Clean Modular Architecture

**Status**: ✅ COMPLIANT

**Module Boundaries**:
- Frontend (React UI) depends on API contracts (abstractions), not backend implementation
- Backend services depend on storage interfaces, not concrete database
- Enrichment service depends on LLM interface, not Ollama specifics
- No circular dependencies between frontend/backend

**Integration Tests Required**:
- Frontend-Backend API contract tests
- Backend-Storage contract tests
- Backend-Ollama integration tests

### Technology Standards

**Status**: ✅ COMPLIANT

- [x] Context7 MCP used for researching Ollama, FastAPI, shadcn/ui (see research.md)
- [x] shadcn/ui specified for all UI components (Input, Button, Card, Skeleton, ScrollArea)

**Post-Design Verification**:
✅ All technology choices researched via Context7 MCP
✅ shadcn/ui components mapped to UI requirements (see data-model.md, contracts/)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # Task, Message domain models
│   ├── services/         # Enrichment, TaskQueue, Storage services
│   ├── api/              # REST/WebSocket endpoints
│   └── lib/              # Ollama client, async utilities
└── tests/
    ├── contract/         # API contract tests
    ├── integration/      # Service integration tests
    └── unit/             # Business logic unit tests

frontend/
├── src/
│   ├── components/       # ChatInput, TaskList, TaskItem (shadcn/ui based)
│   ├── pages/            # Main task entry page
│   ├── services/         # API client, polling logic
│   └── lib/              # UI utilities
└── tests/
    ├── integration/      # Frontend-backend integration tests
    └── unit/             # Component unit tests

docker/
├── backend.Dockerfile
├── frontend.Dockerfile
└── docker-compose.yml
```

**Structure Decision**: Web application architecture with separate frontend (React/TypeScript) and backend (language TBD in research phase). Frontend uses shadcn/ui components. Backend exposes REST API for task CRUD and WebSocket/polling for enrichment status updates. Both packaged as Docker containers orchestrated via docker-compose for single-command deployment.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations. All constitutional requirements satisfied.

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md`

**Key Decisions**:
- Backend: Python 3.11+ with FastAPI
- Frontend: React 18 + TypeScript with Vite
- UI Library: shadcn/ui (constitutional requirement)
- LLM Integration: Ollama with OpenAI-compatible client
- Async Processing: FastAPI BackgroundTasks
- Real-Time Updates: Simple Polling (constitutional simplicity principle)
- Storage: SQLite + SQLAlchemy 2.0
- Deployment: Docker + docker-compose

**All NEEDS CLARIFICATION items resolved**: ✅

---

### Phase 1: Design ✅ COMPLETE

**Outputs**:
- `data-model.md` - Entity definitions, relationships, state transitions
- `contracts/openapi.yaml` - REST API specification (polling-based, no WebSocket)
- `quickstart.md` - Deployment and usage guide
- `CLAUDE.md` - Updated agent context

**Design Artifacts Verification**:
✅ Task entity defined with all required fields (FR-001 to FR-012)
✅ Async enrichment state machine documented (FR-013 to FR-019)
✅ REST API contracts cover all user actions (create task, list tasks, get task)
✅ Polling-based updates for enrichment completion (FR-016) - simpler than WebSocket
✅ Single-command deployment documented (FR-021, SC-011)

**Architectural Simplification**:
✅ **Polling chosen over WebSocket** per constitution's "simpler solution MUST be used" principle
  - Enrichment latency: 2-3s (SC-005)
  - Polling latency: ~250ms average (500ms interval)
  - User impact: None (250ms << 2-3s)
  - Complexity reduction: ~70% less code (no connection management, heartbeat, reconnection)
  - Edge cases eliminated: disconnect handling, stale connections, concurrent connection limits

---

### Constitution Re-Check: POST-DESIGN

**I. Library-First Architecture**: ✅ PASS
- Libraries identified: Enrichment, Storage, TaskQueue, ChatUI
- Each has singular purpose and independent testability
- See `research.md` for library breakdown

**II. Test-Driven Development**: ✅ PASS
- Test types defined: Unit, Integration, Contract
- Testing frameworks selected: pytest, Vitest
- TDD workflow documented in `research.md`
- OpenAPI schema enables contract-first development

**III. Clean Modular Architecture**: ✅ PASS
- Module boundaries defined in `data-model.md`
- Dependency inversion: Frontend → API contracts (not concrete backend)
- Backend → Storage interfaces (not SQLite specifics)
- Integration tests specified in constitution check

**Technology Standards**: ✅ PASS
- Context7 MCP used for all technology research (see `research.md`)
- shadcn/ui components specified for all UI elements (see `contracts/`)

**Conclusion**: No constitutional violations. Ready for Phase 2 (tasks.md generation via `/speckit.tasks`).

---

## Next Steps

1. Run `/speckit.tasks` to generate dependency-ordered task breakdown
2. Run `/speckit.analyze` to cross-check spec, plan, and tasks for consistency
3. Run `/speckit.implement` to execute implementation plan

**Branch**: `001-chat-task-entry` (already created per gitStatus)
**Estimated Implementation Time**: TBD after task generation
