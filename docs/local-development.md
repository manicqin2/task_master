# Local Development Setup

This guide covers setting up TaskMaster for local development using modern tools: **mise** and **uv**.

## Prerequisites

### Install mise (recommended)

**macOS:**
```bash
brew install mise
```

**Linux/WSL:**
```bash
curl https://mise.run | sh
```

**Configure shell (add to ~/.zshrc or ~/.bashrc):**
```bash
eval "$(mise activate zsh)"  # or bash
```

### Install uv (recommended)

**Any platform:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Or with mise:
```bash
mise use -g uv@latest
```

## Quick Start with mise

The project includes a `.mise.toml` file that automatically manages Python and Node.js versions.

```bash
# Clone and navigate to project
cd task_master

# mise automatically activates and creates .venv when you cd into the directory
# If not, trust the config:
mise trust

# Verify tools are installed
mise doctor
```

That's it! mise will:
- ✅ Install Python 3.11
- ✅ Install Node.js 20
- ✅ Create a `.venv` automatically
- ✅ Activate the venv when you cd into the directory

## Backend Development

### Install Dependencies with uv

```bash
cd backend

# Install all dependencies (dev + production)
uv pip install -e .[dev]

# Or install just production dependencies
uv pip install -e .
```

**Why uv?**
- 10-100x faster than pip
- Better dependency resolution
- Reproducible installs
- Compatible with pip workflows

### Run Backend Locally

```bash
# Run database migrations
alembic upgrade head

# Start development server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/unit/test_task_service.py -v

# Run tests matching pattern
pytest -k "enrichment" -v
```

## Frontend Development

### Install Dependencies

```bash
cd frontend

# Install dependencies
npm install

# Or use pnpm (faster)
npm install -g pnpm
pnpm install
```

### Run Frontend Locally

```bash
# Start development server
npm run dev

# Or with pnpm
pnpm dev
```

### Run Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui
```

## Full Stack Development

### Option 1: Docker (Recommended for Full Stack)

```bash
# Start all services
docker compose -f docker/docker-compose.yml up

# Rebuild after dependency changes
docker compose -f docker/docker-compose.yml up --build
```

### Option 2: Local Development (Faster iteration)

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn src.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Ollama (if not using Docker):**
```bash
# Install Ollama from https://ollama.ai
ollama serve
ollama pull llama3.2
```

## Environment Variables

### Backend (.env)

Create `backend/.env`:
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DATABASE_URL=sqlite+aiosqlite:///./data/tasks.db
```

### Frontend (.env)

Create `frontend/.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_POLLING_INTERVAL=500
```

## Common Tasks

### Add Python Dependency

```bash
cd backend

# Add to pyproject.toml dependencies, then:
uv pip install -e .[dev]
```

### Add Frontend Dependency

```bash
cd frontend

# Install package
npm install <package-name>

# Install as dev dependency
npm install -D <package-name>
```

### Database Migrations

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Code Quality

**Backend:**
```bash
cd backend

# Format code
black src/ tests/

# Lint
flake8 src/ tests/

# Type check
mypy src/
```

**Frontend:**
```bash
cd frontend

# Format
npm run format

# Lint
npm run lint
```

## Troubleshooting

### mise not activating venv

```bash
# Check mise status
mise doctor

# Re-trust config
mise trust

# Manually activate
source .venv/bin/activate
```

### uv command not found

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with mise
mise use -g uv@latest

# Verify installation
uv --version
```

### Port already in use

```bash
# Find process using port 8000
lsof -ti:8000 | xargs kill -9

# Or change port in .env
```

## IDE Setup

### VS Code

Install recommended extensions:
- Python
- Pylance
- ESLint
- Prettier
- Tailwind CSS IntelliSense

The project includes settings in `.vscode/settings.json` (create if needed):
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.testing.pytestEnabled": true,
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "editor.formatOnSave": true,
  "python.formatting.provider": "black"
}
```

## Performance Tips

1. **Use uv instead of pip**: 10-100x faster dependency installation
2. **Use mise for automatic venv**: No manual activation needed
3. **Use pnpm instead of npm**: Faster frontend builds
4. **Enable hot reload**: Both backend and frontend support it
5. **Run Ollama locally**: Faster than Docker for development

## Next Steps

- Read the [Architecture Guide](../specs/001-chat-task-entry/plan.md)
- Review [API Documentation](http://localhost:8000/docs) when running
- Check [Testing Guide](../specs/001-chat-task-entry/quickstart.md#running-tests)
