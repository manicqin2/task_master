# task_master Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-04

## Active Technologies
- GitLab CI/CD YAML (v1), Python 3.11+ (for backend), Node.js 18+ (for frontend) + GitLab CI Templates (Secret-Detection, Dependency-Scanning, SAST), Gitleaks (secret detection), Gemnasium (dependency scanning), Semgrep (SAST) (002-gitlab-security-pipeline)
- GitLab Security Dashboard (native), Artifact storage for security reports (JSON) (002-gitlab-security-pipeline)
- TypeScript 5.x + React 18 + React 18, @tanstack/react-query 5.x, shadcn/ui components, Framer Motion (animations) (003-task-lane-workflow)
- N/A (extends existing backend from Feature 001, no new database tables) (003-task-lane-workflow)
- Python 3.11+ (backend), TypeScript 5.2+ (frontend) (004-task-metadata-extraction)
- SQLite via SQLAlchemy (async), extending existing Task model with metadata fields (004-task-metadata-extraction)
- Python 3.11+ (backend matches existing project) (005-three-table-schema)
- SQLite with foreign key support enabled (existing database) (005-three-table-schema)
- Python 3.11+ (matches existing backend, google-genai requires 3.9+) + `google-genai` (unified SDK, GA since May 2025) - replaces openai package for Ollama (006-gemini-llm)
- SQLite via SQLAlchemy (no changes - existing database schema supports this migration) (006-gemini-llm)
- TypeScript 5.2+ + @playwright/test (latest), Playwright browsers (009-playwright-tests)
- N/A (test-only feature, no data persistence) (009-playwright-tests)

### Feature: 001-chat-task-entry

**Backend**:
- Python 3.11+ with FastAPI
- SQLAlchemy 2.0 + SQLite
- Google Gemini API (google-genai SDK v1.56+)
- pytest + pytest-asyncio

**Frontend**:
- React 18 + TypeScript
- Vite (build tool)
- shadcn/ui (UI components)
- @tanstack/react-query (async state)
- Vitest + @testing-library/react

**Infrastructure**:
- Docker + docker-compose
- Gemini 3 Flash (cloud-based LLM)

## Project Structure

```text
backend/
├── src/
│   ├── models/           # Task, Message domain models
│   ├── services/         # Enrichment, TaskQueue, Storage services
│   ├── api/              # REST API endpoints
│   └── lib/              # Gemini client, async utilities, database
└── tests/
    ├── contract/         # API contract tests
    ├── integration/      # Service integration tests
    └── unit/             # Business logic unit tests

frontend/
├── src/
│   ├── components/
│   │   ├── ChatInput, TaskList, TaskItem (Feature 001)
│   │   └── LaneWorkflow/ # Multi-lane task visualization (Feature 003)
│   │       ├── LaneWorkflow.tsx    # Container with 3-column layout
│   │       ├── Lane.tsx            # Single lane component
│   │       ├── TaskCard.tsx        # Task card with emblems
│   │       ├── ActionEmblem.tsx    # Action button with tooltip
│   │       └── ErrorMessage.tsx    # Error display component
│   ├── hooks/
│   │   ├── useTasks.ts             # TanStack Query for task fetching
│   │   ├── useTaskActions.ts       # Cancel, retry, expand mutations
│   │   ├── useLaneWorkflow.ts      # Lane distribution logic
│   │   └── useTimeoutDetection.ts  # 30s timeout detection
│   ├── types/            # Task, TaskWithLane, Lane types
│   ├── pages/            # Main task entry page
│   ├── services/         # API client, polling logic
│   └── lib/              # UI utilities
└── tests/
    ├── e2e/              # Playwright end-to-end tests (Feature 003)
    ├── integration/      # Frontend-backend integration tests
    └── unit/             # Component unit tests

docker/
├── backend.Dockerfile
├── frontend.Dockerfile
└── docker-compose.yml
```

## Environment Variables

### Required Configuration

**Gemini API** (for task enrichment):
- `GEMINI_API_KEY`: Your Google AI API key (get from https://aistudio.google.com/)
- `GEMINI_MODEL`: Model name (default: `gemini-3-flash-preview`)
- `GEMINI_TIMEOUT`: Request timeout in seconds (default: `15.0`)
- `GEMINI_MAX_RETRIES`: Maximum retry attempts (default: `3`)

Create a `.env` file in the project root:
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_TIMEOUT=15.0
GEMINI_MAX_RETRIES=3
```

## Commands

### Development

```bash
# Start all services
docker compose up

# Run backend tests
docker compose exec backend pytest

# Run frontend tests
docker compose exec frontend npm test

# Access backend shell
docker compose exec backend bash

# View logs
docker compose logs -f backend
```

### Testing

```bash
# Run all tests
docker compose exec backend pytest

# Run contract tests
docker compose exec backend pytest tests/contract/

# Run integration tests
docker compose exec backend pytest tests/integration/

# Run frontend tests
docker compose exec frontend npm test

# Run E2E tests (Feature 003)
docker compose exec frontend npm run test:e2e
```

## Code Style

**Python (Backend)**:
- Follow PEP 8
- Use type hints (validated with mypy)
- Async functions for I/O operations
- SQLAlchemy 2.0 async patterns

**TypeScript (Frontend)**:
- Follow ESLint + Prettier configuration
- Strict TypeScript mode enabled
- React functional components with hooks
- shadcn/ui component conventions

## Recent Changes
- 009-playwright-tests: Added TypeScript 5.2+ + @playwright/test (latest), Playwright browsers
- 006-gemini-llm: Added Python 3.11+ (matches existing backend, google-genai requires 3.9+) + `google-genai` (unified SDK, GA since May 2025) - replaces openai package for Ollama
- 005-three-table-schema: Added Python 3.11+ (backend matches existing project)


<!-- MANUAL ADDITIONS START -->

### Feature 003: Multi-Lane Task Workflow (Task Workbench)

**Purpose**: Task creation workflow - transforms raw user input into enriched, metadata-complete tasks ready for the todo list.

**Key Concepts**:
  - **Pending**: Tasks being enriched by LLM (status: pending/processing)
  - **More Info**: Tasks needing user attention (status: failed OR missing required metadata like project)
  - **Ready**: Tasks complete and ready to enter todo list (status: completed AND has all required metadata)

**Component Architecture**:
```
LaneWorkflow (Task Workbench container)
├── Lane × 3 (Pending, More Info, Ready)
│   └── TaskCard × N
│       ├── Metadata Display (badges, avatars, deadline indicator)
│       ├── ActionEmblem (cancel/retry/expand buttons with tooltips)
│       └── ErrorMessage (for failed tasks)
```

**State Management**:

**Testing Strategy**:

### Feature 004: Task Metadata Extraction

**Purpose**: Automatically extract structured metadata from natural language task descriptions using LLM.

**Extracted Fields**:

**Confidence Threshold**: 0.7 - fields with lower confidence require user attention

**Timeout**: 60 seconds (configurable via OLLAMA_TIMEOUT env var)

<!-- MANUAL ADDITIONS END -->
