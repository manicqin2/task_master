# task_master Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-04

## Active Technologies

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

- 001-chat-task-entry: Added

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
