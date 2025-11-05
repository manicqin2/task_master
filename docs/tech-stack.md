# Task Master Technology Stack

**Last Updated**: 2025-11-04
**Project Type**: Local-first AI-powered task management web application
**Architecture**: Local Backend (Python FastAPI) + Web Frontend (React)

---

## Frontend

### Framework
- **Framework**: React 18+ with Vite 5+
- **Language**: TypeScript 5.x
- **Build Tool**: Vite (fast HMR, optimized builds)

### UI & Styling
- **Component Library**: shadcn/ui (required per constitution v1.1.0)
- **Styling**: Tailwind CSS 3.x
- **Icons**: Lucide React (default with shadcn/ui)

### State Management
- **Server State**: TanStack Query (React Query) v5
  - API data caching and synchronization
  - Optimistic updates
  - Auto-refetching and background updates
- **Client State**: React built-in (useState, useContext) for simple UI state
  - Can add Zustand later if needed for complex client state

---

## Backend

### Runtime & Framework
- **Runtime**: Python 3.12
- **Framework**: FastAPI 0.100+
- **ASGI Server**: Uvicorn (development) / Gunicorn + Uvicorn workers (production)

### API Design
- **Pattern**: REST API
- **Validation**: Pydantic v2 (built into FastAPI)
- **Documentation**: Auto-generated OpenAPI (Swagger UI at `/docs`)
- **CORS**: FastAPI CORS middleware (for localhost frontend)

---

## AI & ML

### LLM Integration
- **Provider**: Local Ollama
- **Recommended Models**:
  - Llama 3.1 (8B for speed, 70B for quality)
  - Mistral 7B (alternative, faster)
  - Qwen2.5 (good at structured output)
- **Client**: `ollama` Python package or direct HTTP API
- **Structured Output**: Use JSON mode or guided generation

### Vector Database (RAG System)
- **Database**: ChromaDB (local, in-process)
- **Embedding Model**:
  - Primary: `all-MiniLM-L6-v2` (via sentence-transformers)
  - Alternative: Ollama embeddings (nomic-embed-text)
- **Integration**: `chromadb` Python package

### NLP & Processing
- **Date Parsing**: `dateparser` (Python) - natural language date extraction
- **Text Processing**: Built-in string operations + regex
- **Task Context Extraction**: Custom prompts to Ollama

---

## Data Storage

### Primary Database
- **Type**: SQLite (local file: `task_master.db`)
- **ORM**: SQLModel (Pydantic + SQLAlchemy)
- **Migrations**: Alembic (if needed for schema changes)
- **Location**: Backend directory, excluded from git

### Browser Storage
- **Not needed**: All data stored in backend SQLite
- **Optional**: LocalStorage for UI preferences (theme, layout)

---

## Development Tools

### MCP Integration
- **Documentation**: Context7 (required per constitution v1.1.0)
- **Usage**: Research libraries and frameworks before implementation
- **Server**: Claude Code with MCP support

### Testing

#### Backend (Python)
- **Framework**: pytest 7+
- **Coverage**: pytest-cov
- **FastAPI Testing**: `TestClient` (built-in)
- **DB Testing**: In-memory SQLite for test isolation

#### Frontend (React/TypeScript)
- **Framework**: Vitest 1+ (Vite-native)
- **React Testing**: @testing-library/react
- **Coverage**: vitest coverage (via c8)

#### End-to-End
- **Framework**: Playwright
- **Coverage**: Full user workflows across frontend + backend

### Code Quality

#### Frontend
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged (pre-commit)

#### Backend
- **Linting**: Ruff (modern Python linter/formatter)
- **Type Checking**: mypy (optional, Pydantic provides runtime validation)
- **Formatting**: Ruff formatter (replaces Black)

### Build & Deploy
- **Development**:
  - Frontend: `npm run dev` (Vite dev server on localhost:5173)
  - Backend: `uvicorn main:app --reload` (localhost:8000)
- **Production**:
  - Frontend: `npm run build` → static files served by backend
  - Backend: Uvicorn or Gunicorn
- **Containerization**: Docker (optional, for easier distribution)

---

## Performance & Monitoring

### Performance
- **Frontend Bundling**: Vite code splitting, lazy loading routes
- **API Caching**: TanStack Query automatic caching
- **Database**: SQLite with proper indexes
- **LLM**: Stream responses for better perceived performance

### Monitoring
- **Error Tracking**: Local logging only (privacy-first)
- **Analytics**: None (privacy-first)
- **Logging**:
  - Backend: Python `logging` module or `loguru`
  - Frontend: Console in development, minimal in production

---

## Security

### Authentication
- **Strategy**: Not required for v1 (single-user local app)
- **Future**: Optional password protection for app access

### Data Protection
- **Storage**: All data local to user's machine
- **Encryption**: None needed for v1 (OS-level file system security)
- **Validation**: Pydantic schemas on all API inputs
- **CORS**: Restricted to localhost origins only

---

## Architecture Decisions

### Local-First Implementation
- **Approach**:
  - Backend runs on localhost (Python FastAPI server)
  - Frontend runs in browser (React app)
  - All data stored in local SQLite database
  - No external API calls except to local Ollama
- **Deployment**: User runs both backend and frontend locally
- **Startup**: Single command via script (e.g., `npm start` runs both)

### Project Structure
```
task_master/
├── backend/               # Python FastAPI application
│   ├── src/
│   │   ├── models/       # SQLModel database models
│   │   ├── services/     # Business logic (library-first)
│   │   ├── api/          # FastAPI route handlers
│   │   └── lib/          # Reusable libraries
│   ├── tests/            # pytest tests
│   ├── task_master.db    # SQLite database (gitignored)
│   └── requirements.txt
├── frontend/             # React + Vite application
│   ├── src/
│   │   ├── components/   # React components (shadcn/ui)
│   │   ├── lib/          # Utilities, API client
│   │   ├── hooks/        # React hooks (TanStack Query)
│   │   └── pages/        # Route pages
│   ├── tests/            # Vitest tests
│   └── package.json
├── tests/                # E2E Playwright tests
├── docs/                 # Documentation
└── .specify/             # SpecKit templates and constitution
```

### Modularity
- **Pattern**: Library-first architecture (per constitution)
- Each feature built as standalone library in `backend/src/lib/` and `frontend/src/lib/`
- Libraries have clear APIs and are independently testable
- Main application composes libraries

---

## Core Dependencies

### Backend (Python)
```txt
fastapi>=0.100.0
uvicorn[standard]>=0.24.0
sqlmodel>=0.0.14
chromadb>=0.4.0
ollama>=0.1.0
sentence-transformers>=2.2.0
dateparser>=1.1.0
pydantic>=2.0.0
python-multipart>=0.0.6
pytest>=7.4.0
pytest-cov>=4.1.0
ruff>=0.1.0
```

### Frontend (TypeScript/React)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.292.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "tailwindcss": "^3.4.0",
    "playwright": "^1.40.0"
  }
}
```

---

## Getting Started Commands

### Initial Setup
```bash
# Clone and enter directory
cd task_master

# Backend setup
cd backend
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Install Ollama and pull model
ollama pull llama3.1
```

### Development
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn src.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Ollama (if not running as service)
ollama serve
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## Notes

- ✅ Stack adheres to TaskMaster Constitution v1.1.0
- ✅ Supports strict TDD workflow (pytest + Vitest + Playwright)
- ✅ Uses Context7 MCP for library documentation
- ✅ Uses shadcn/ui for all UI components
- ✅ Library-first architecture enabled
- ✅ True local-first: no cloud dependencies

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-04 | Vite + React | Fast, lightweight, good for local-first SPAs |
| 2025-11-04 | FastAPI (Python 3.12) | Excellent AI/ML ecosystem, async, type-safe |
| 2025-11-04 | SQLModel | Perfect FastAPI integration, Pydantic models |
| 2025-11-04 | ChromaDB | Python-native, simple local vector DB |
| 2025-11-04 | Local Ollama | True privacy, offline capability, no API costs |
| 2025-11-04 | TanStack Query | Best-in-class API state management for React |
| 2025-11-04 | TypeScript | Type safety, better DX, pairs with FastAPI types |
| 2025-11-04 | Tailwind + shadcn/ui | Required by constitution, excellent DX |
| 2025-11-04 | Full test suite | pytest + Vitest + Playwright for TDD compliance |
