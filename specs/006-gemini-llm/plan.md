# Implementation Plan: Replace Ollama with Gemini 3 LLM

**Branch**: `006-gemini-llm` | **Date**: 2025-12-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-gemini-llm/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the current Ollama local LLM with Google's Gemini 3 API for task enrichment and metadata extraction. The primary requirement is to maintain 100% feature parity with the existing enrichment capabilities while eliminating the need for local Ollama infrastructure. This migration will simplify deployment (no Docker volumes or model downloads), reduce operational complexity, and provide access to Google's latest LLM capabilities through a managed API service.

## Technical Context

**Language/Version**: Python 3.11+ (matches existing backend, google-genai requires 3.9+)
**Primary Dependencies**: `google-genai` (unified SDK, GA since May 2025) - replaces openai package for Ollama
**Storage**: SQLite via SQLAlchemy (no changes - existing database schema supports this migration)
**Testing**: pytest + pytest-asyncio (existing test framework)
**Target Platform**: Linux server (Docker containers) + VPS deployment
**Project Type**: Web (backend API modification only, frontend unchanged)
**Performance Goals**:
- <1.5 seconds average enrichment time (improved from 1-3s with Ollama)
- Maintain <5 second p95 latency for user-facing operations
**Constraints**:
- Free tier: 10 RPM (requests per minute) for gemini-2.5-flash
- Estimated cost: ~$0.60/month on paid tier ($0.10/1M input tokens, $0.40/1M output)
- Timeout: 120s (Ollama legacy) → 15s (Gemini target, configurable via GEMINI_TIMEOUT env var)
- Must handle rate limiting gracefully with exponential backoff
- Zero downtime migration (existing tasks must remain accessible)
**Scale/Scope**:
- Single backend service modification (replace ollama_client.py with gemini_client.py)
- ~2-3 service files affected (metadata_extraction.py, enrichment_service.py)
- No database migrations required
- Remove Ollama container from docker-compose
- Model: gemini-2.5-flash (recommended for speed and cost efficiency)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Library-First Architecture
**Status**: ✅ PASS

- **Requirement**: Feature must be implemented as standalone library
- **Compliance**: The Gemini client will be implemented as a self-contained library (`gemini_client.py`) with minimal dependencies, following the same pattern as the existing `ollama_client.py`
- **Testing**: Library will be independently testable with unit tests and contract tests
- **Justification**: N/A - no violations

### II. Test-Driven Development
**Status**: ✅ PASS

- **Requirement**: Tests MUST be written before implementation
- **Compliance**: Will follow strict TDD:
  1. Write failing tests for Gemini client interface (contract tests)
  2. Write failing integration tests for enrichment workflow
  3. Implement Gemini client to pass tests
  4. Refactor for code quality
- **Justification**: N/A - no violations

### III. Clean Modular Architecture
**Status**: ✅ PASS

- **Requirement**: Clear separation of concerns and explicit dependency boundaries
- **Compliance**:
  - LLM client abstraction (interface-based design)
  - Business logic (enrichment_service.py) remains unchanged
  - Infrastructure (API client) cleanly separated
  - Existing module boundaries preserved
- **Justification**: N/A - no violations

### Visual Documentation Standards
**Status**: ✅ PLANNED

- **Required Diagrams** (Integration Feature):
  - System integration diagram (before/after Ollama → Gemini)
  - Sequence diagram for enrichment flow with Gemini
  - Authentication/authorization flow
  - Error handling and retry logic
- **Delivery**: architecture.md will be created in Phase 1

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
│   ├── lib/
│   │   ├── gemini_client.py          # NEW: Gemini API client (replaces ollama_client.py)
│   │   ├── ollama_client.py          # TO REMOVE: Legacy Ollama client
│   │   └── metadata_parsers.py       # UNCHANGED: Utility parsers
│   ├── services/
│   │   ├── metadata_extraction.py    # MODIFIED: Update to use gemini_client
│   │   └── enrichment_service.py     # MODIFIED: Update client initialization
│   └── models/
│       └── task_metadata.py          # UNCHANGED: Pydantic schemas
└── tests/
    ├── contract/
    │   └── test_gemini_client.py     # NEW: Gemini client contract tests
    ├── integration/
    │   └── test_enrichment_workflow.py # MODIFIED: Update for Gemini
    └── unit/
        ├── test_gemini_client.py      # NEW: Gemini client unit tests
        └── test_metadata_extraction.py # MODIFIED: Update mocks

docker/
├── docker-compose.yml                 # MODIFIED: Remove Ollama service
└── docker-compose.prod.yml            # MODIFIED: Remove Ollama service

.env.development                       # MODIFIED: Add GEMINI_API_KEY
.env.production.example                # MODIFIED: Add GEMINI_API_KEY
```

**Structure Decision**: Web application structure (backend modification only). This feature only touches the backend service - specifically the LLM client library and services that consume it. Frontend remains completely unchanged as it only communicates with the backend API, which maintains the same contract.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitutional requirements are met.
