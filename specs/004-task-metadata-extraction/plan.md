# Implementation Plan: Task Metadata Extraction

**Branch**: `004-task-metadata-extraction` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-task-metadata-extraction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extend the existing task enrichment pipeline to extract structured metadata from natural language task descriptions. When a user creates a task, the system will automatically extract project names, person names, deadlines, task type, priority, effort estimates, dependencies, and tags. Tasks with low-confidence or missing required fields will route to a "Need Attention" lane for user review. The feature includes rich visual display of metadata on task cards and optional debug mode showing the AI's chain of thought reasoning process.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.2+ (frontend)
**Primary Dependencies**:
- Backend: FastAPI, SQLAlchemy 2.0, OpenAI client (Ollama-compatible), Pydantic
- Frontend: React 18, @tanstack/react-query 5.x, shadcn/ui, Framer Motion
**Storage**: SQLite via SQLAlchemy (async), extending existing Task model with metadata fields
**Testing**: pytest + pytest-asyncio (backend), Vitest + @testing-library/react (frontend), Playwright (E2E)
**Target Platform**: Web application (Docker containerized Linux server + browser frontend)
**Project Type**: Web (backend + frontend structure)
**Performance Goals**:
- Metadata extraction completes within 2 seconds for 95% of tasks
- LLM response time <1.5s average
- Frontend renders metadata updates within 300ms of cache update
**Constraints**:
- Must reuse existing Feature 001 enrichment infrastructure
- Cannot block task creation if extraction fails
- LLM timeout set via OLLAMA_TIMEOUT environment variable (default: 60 seconds)
- Chain of thought data must not impact primary user experience (debug-only)
- Must work with existing 500ms polling interval from Feature 001
**Scale/Scope**:
- Support extraction from task descriptions up to 5000 characters
- Handle 10+ metadata fields per task
- Confidence scoring for each field (0-100%)
- 70% confidence threshold for auto-population

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Library-First Architecture
- **Status**: PASS
- **Assessment**: Feature extends existing enrichment service as a focused metadata extraction module. Will be implemented as a self-contained service library that can be tested independently.
- **Action**: Create `backend/src/services/metadata_extraction.py` as standalone library with minimal dependencies on existing code.

### ✅ Test-Driven Development
- **Status**: PASS
- **Assessment**: Feature will follow strict TDD workflow:
  1. Write contract tests for metadata extraction API
  2. Write unit tests for extraction logic (project, person, deadline, type, priority parsing)
  3. Write integration tests for enrichment pipeline extension
  4. Write E2E tests for Need Attention lane workflow
- **Action**: Tests will be written and approved before implementation begins.

### ✅ Clean Modular Architecture
- **Status**: PASS
- **Assessment**:
  - Clear separation: Metadata extraction logic isolated from storage/API layers
  - Explicit interfaces: MetadataExtractor protocol defining extraction contract
  - Dependency inversion: Extraction service depends on LLM abstraction, not concrete Ollama client
  - No circular dependencies: Frontend → API → Service → LLM (unidirectional)
- **Action**: Define explicit contracts between enrichment service, metadata extractor, and storage layer.

### ✅ Testing Requirements
- **Status**: PASS
- **Assessment**: Plan includes:
  - Contract tests for metadata extraction API endpoints (POST /api/tasks/:id/metadata)
  - Integration tests for enrichment pipeline + metadata extraction
  - Unit tests for all parsing logic (dates, names, priorities, types)
  - E2E tests for Need Attention lane user workflows
- **Action**: All tests automated in CI/CD pipeline via existing pytest/Vitest setup.

### ✅ Visual Documentation Standards
- **Status**: PASS (Phase 1 completed)
- **Assessment**: Created `architecture.md` with comprehensive Mermaid diagrams:
  - Component diagram: System architecture with Frontend, Backend, Storage, and External services
  - Sequence diagram: Task creation → enrichment → metadata extraction → storage flow
  - State transition diagram: Task metadata states (Created → Extracting → Complete/NeedsAttention/Failed)
  - Data flow diagram: Metadata extraction pipeline with confidence thresholds
  - Additional diagrams: Need Attention workflow, debug mode, caching strategy, error handling, performance timeline, deployment architecture
- **Action**: ✓ Completed - 12 diagrams created covering all feature aspects

### ✅ Technology Standards
- **Status**: PASS
- **Assessment**:
  - Used Context7 MCP server for research on OpenAI Structured Outputs, Pydantic, dateutil, confidence scoring
  - Designed shadcn/ui components for metadata display (MetadataBadges, PersonAvatars, DeadlineIndicator, DebugPanel)
  - Leveraging existing OpenAI-compatible client (Ollama) for LLM access
- **Action**: ✓ Completed - Research documented in `research.md`

**Overall Gate Status**: PASS (all requirements met, Phase 1 design complete)

## Project Structure

### Documentation (this feature)

```text
specs/004-task-metadata-extraction/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── architecture.md      # Phase 1 output - Mermaid diagrams
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── metadata-extraction.yaml  # OpenAPI spec for metadata endpoints
├── checklists/
│   └── requirements.md  # Spec quality checklist (already completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── task_metadata.py          # NEW: TaskMetadata model extending Task
│   ├── services/
│   │   ├── enrichment.py              # EXISTING: Extend with metadata extraction
│   │   ├── metadata_extraction.py     # NEW: Core metadata extraction library
│   │   └── llm_client.py              # EXISTING: Reuse for extraction prompts
│   ├── api/
│   │   └── tasks.py                   # EXISTING: Extend with metadata endpoints
│   └── lib/
│       └── metadata_parsers.py        # NEW: Date, name, priority parsing utilities
└── tests/
    ├── contract/
    │   └── test_metadata_api.py       # NEW: Contract tests for metadata endpoints
    ├── integration/
    │   └── test_metadata_enrichment.py # NEW: Integration with enrichment pipeline
    └── unit/
        ├── test_metadata_extraction.py # NEW: Unit tests for extraction logic
        └── test_metadata_parsers.py    # NEW: Unit tests for parsing utilities

frontend/
├── src/
│   ├── components/
│   │   ├── LaneWorkflow/              # EXISTING: Extend for Need Attention lane
│   │   ├── TaskCard/                  # NEW: Rich metadata display components
│   │   │   ├── MetadataBadges.tsx     # NEW: Project, type, priority badges
│   │   │   ├── PersonAvatars.tsx      # NEW: Person display
│   │   │   ├── DeadlineIndicator.tsx  # NEW: Deadline display
│   │   │   └── DebugPanel.tsx         # NEW: Chain of thought viewer
│   │   └── NeedAttention/             # NEW: Components for incomplete metadata
│   │       ├── FieldPrompt.tsx        # NEW: Prompt for missing field
│   │       └── SuggestedValues.tsx    # NEW: Dropdown for suggested values
│   ├── hooks/
│   │   ├── useTaskMetadata.ts         # NEW: Query hook for metadata
│   │   └── useMetadataUpdate.ts       # NEW: Mutation hook for manual updates
│   ├── types/
│   │   └── metadata.ts                # NEW: TypeScript types for metadata
│   ├── pages/                         # EXISTING: No changes
│   └── services/
│       └── api.ts                     # EXISTING: Extend with metadata endpoints
└── tests/
    ├── e2e/
    │   └── metadata-workflow.spec.ts  # NEW: E2E tests for metadata extraction
    ├── integration/
    │   └── metadata-display.test.tsx  # NEW: Integration tests for metadata UI
    └── unit/
        ├── TaskCard.test.tsx          # NEW: Component tests
        └── metadata-parsers.test.ts   # NEW: Parser utility tests
```

**Structure Decision**: Web application structure (Option 2) with backend + frontend. Feature extends existing enrichment service in backend and adds new metadata display components in frontend. Maintains existing separation of concerns with models, services, API, and components.

## Complexity Tracking

> **No violations detected - table intentionally empty.**

All constitution requirements are met without exceptions. Feature follows library-first architecture, TDD practices, and maintains clean modular boundaries.
