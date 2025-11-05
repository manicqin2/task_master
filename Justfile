# TaskMaster Development Commands
# Install just: brew install just (macOS) or cargo install just

# List available commands
default:
    @just --list

# Install all dependencies (requires mise and uv)
install:
    @echo "Installing backend dependencies with uv..."
    cd backend && uv pip install -e .[dev]
    @echo "Installing frontend dependencies..."
    cd frontend && npm install
    @echo "✓ All dependencies installed"

# Run backend tests
test-backend:
    cd backend && pytest -v

# Run frontend tests
test-frontend:
    cd frontend && npm test

# Run all tests
test: test-backend test-frontend

# Run backend with hot reload
dev-backend:
    cd backend && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run frontend with hot reload
dev-frontend:
    cd frontend && npm run dev

# Start all services with Docker
up:
    docker compose -f docker/docker-compose.yml up

# Start all services in background
up-detached:
    docker compose -f docker/docker-compose.yml up -d

# Stop all Docker services
down:
    docker compose -f docker/docker-compose.yml down

# Rebuild and start Docker services
rebuild:
    docker compose -f docker/docker-compose.yml up --build

# Run database migrations
migrate:
    cd backend && alembic upgrade head

# Create new migration
migration message:
    cd backend && alembic revision --autogenerate -m "{{message}}"

# Format backend code
format-backend:
    cd backend && black src/ tests/

# Format frontend code
format-frontend:
    cd frontend && npm run format

# Format all code
format: format-backend format-frontend

# Lint backend code
lint-backend:
    cd backend && flake8 src/ tests/
    cd backend && mypy src/

# Lint frontend code
lint-frontend:
    cd frontend && npm run lint

# Lint all code
lint: lint-backend lint-frontend

# Run all quality checks
check: format lint test

# Clean generated files
clean:
    rm -rf backend/.pytest_cache
    rm -rf backend/.mypy_cache
    rm -rf backend/__pycache__
    rm -rf frontend/dist
    rm -rf frontend/node_modules/.cache
    find . -type d -name "__pycache__" -exec rm -rf {} +
    @echo "✓ Cleaned generated files"

# Pull Ollama model
ollama-pull:
    docker compose -f docker/docker-compose.yml exec ollama ollama pull llama3.2

# Show Docker logs
logs:
    docker compose -f docker/docker-compose.yml logs -f

# Show backend logs only
logs-backend:
    docker compose -f docker/docker-compose.yml logs -f backend

# Show frontend logs only
logs-frontend:
    docker compose -f docker/docker-compose.yml logs -f frontend

# Run tests in Docker
docker-test:
    docker compose -f docker/docker-compose.yml exec backend pytest -v

# Open API documentation
docs:
    open http://localhost:8000/docs

# Open frontend
open-app:
    open http://localhost:3000
