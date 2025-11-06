# task_master Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-04

## Active Technologies
- GitLab CI/CD YAML (v1), Python 3.11+ (for backend), Node.js 18+ (for frontend) + GitLab CI Templates (Secret-Detection, Dependency-Scanning, SAST), Gitleaks (secret detection), Gemnasium (dependency scanning), Semgrep (SAST) (002-gitlab-security-pipeline)
- GitLab Security Dashboard (native), Artifact storage for security reports (JSON) (002-gitlab-security-pipeline)
- TypeScript 5.x + React 18 + React 18, @tanstack/react-query 5.x, shadcn/ui components, Framer Motion (animations) (003-task-lane-workflow)
- N/A (extends existing backend from Feature 001, no new database tables) (003-task-lane-workflow)
- Python 3.11+ (backend), TypeScript 5.2+ (frontend) (004-task-metadata-extraction)
- SQLite via SQLAlchemy (async), extending existing Task model with metadata fields (004-task-metadata-extraction)

### Feature: 001-chat-task-entry

**Backend**:
- Python 3.11+ with FastAPI
- SQLAlchemy 2.0 + SQLite
- Ollama (OpenAI-compatible client)
- pytest + pytest-asyncio

**Frontend**:
- React 18 + TypeScript
- Vite (build tool)
- shadcn/ui (UI components)
- @tanstack/react-query (async state)
- Vitest + @testing-library/react

**Infrastructure**:
- Docker + docker-compose
- Ollama llama3.2 model

## Project Structure

```text
backend/
├── src/
│   ├── models/           # Task, Message domain models
│   ├── services/         # Enrichment, TaskQueue, Storage services
│   ├── api/              # REST API endpoints
│   └── lib/              # Ollama client, async utilities
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
- 004-task-metadata-extraction: Added Python 3.11+ (backend), TypeScript 5.2+ (frontend)
- 003-task-lane-workflow: Added TypeScript 5.x + React 18 + React 18, @tanstack/react-query 5.x, shadcn/ui components, Framer Motion (animations)
- 002-gitlab-security-pipeline: Added GitLab CI/CD YAML (v1), Python 3.11+ (for backend), Node.js 18+ (for frontend) + GitLab CI Templates (Secret-Detection, Dependency-Scanning, SAST), Gitleaks (secret detection), Gemnasium (dependency scanning), Semgrep (SAST)


<!-- MANUAL ADDITIONS START -->

### Feature 003: Multi-Lane Task Workflow (Task Workbench)

**Purpose**: Task creation workflow - transforms raw user input into enriched, metadata-complete tasks ready for the todo list.

**Key Concepts**:
- **Task Workbench**: Three-lane interface for task creation and enrichment
- **Lane Types**:
  - **Pending**: Tasks being enriched by LLM (status: pending/processing)
  - **More Info**: Tasks needing user attention (status: failed OR missing required metadata like project)
  - **Ready**: Tasks complete and ready to enter todo list (status: completed AND has all required metadata)
- **Required Metadata**: Tasks must have a `project` assigned to move to Ready lane
- **Lane Derivation**: Based on `enrichment_status` + metadata completeness
- **Action Emblems**: Cancel (Pending/More Info), Retry (More Info), Expand (long text)
- **Delete Behavior**: Cancel in More Info lane permanently deletes task from backend

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
- TanStack Query cache stores tasks with `isExpanded` client-side flag
- Mutations: cancelMutation (deletes if failed), retryMutation (backend call), expandMutation (toggles flag)
- Optimistic updates for instant UI feedback on cancel/expand

**Testing Strategy**:
- Unit tests: Component rendering, emblem visibility, lane derivation logic
- Integration tests: Polling updates, cache invalidation, mutation behavior
- E2E tests (Playwright): Full user journeys, performance validation, timeout scenarios

### Feature 004: Task Metadata Extraction

**Purpose**: Automatically extract structured metadata from natural language task descriptions using LLM.

**Extracted Fields**:
- **Project** (required for Ready lane)
- **Persons** (displayed as avatar circles)
- **Task Type** (meeting, call, email, review, development, research, administrative, other)
- **Priority** (low, normal, high, urgent)
- **Deadline** (natural language → parsed datetime)
- **Effort Estimate** (minutes)
- **Dependencies**, **Tags**

**Confidence Threshold**: 0.7 - fields with lower confidence require user attention

**Timeout**: 60 seconds (configurable via OLLAMA_TIMEOUT env var)

<!-- MANUAL ADDITIONS END -->
