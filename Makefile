.PHONY: help install test dev up down clean

help:
	@echo "TaskMaster Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install        - Install all dependencies (requires mise + uv)"
	@echo ""
	@echo "Development:"
	@echo "  make dev-backend    - Run backend with hot reload"
	@echo "  make dev-frontend   - Run frontend with hot reload"
	@echo "  make up             - Start all services with Docker"
	@echo "  make down           - Stop Docker services"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-backend   - Run backend tests"
	@echo "  make test-frontend  - Run frontend tests"
	@echo ""
	@echo "Quality:"
	@echo "  make format         - Format all code"
	@echo "  make lint           - Lint all code"
	@echo "  make check          - Run all quality checks"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run database migrations"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Remove generated files"
	@echo "  make logs           - Show Docker logs"

install:
	@echo "Installing backend dependencies with uv..."
	cd backend && uv pip install -e .[dev]
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✓ All dependencies installed"

test-backend:
	cd backend && pytest -v

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

dev-backend:
	cd backend && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

up:
	docker compose -f docker/docker-compose.yml up

down:
	docker compose -f docker/docker-compose.yml down

rebuild:
	docker compose -f docker/docker-compose.yml up --build

migrate:
	cd backend && alembic upgrade head

format-backend:
	cd backend && black src/ tests/

format-frontend:
	cd frontend && npm run format

format: format-backend format-frontend

lint-backend:
	cd backend && flake8 src/ tests/
	cd backend && mypy src/

lint-frontend:
	cd frontend && npm run lint

lint: lint-backend lint-frontend

check: format lint test

clean:
	rm -rf backend/.pytest_cache
	rm -rf backend/.mypy_cache
	rm -rf backend/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.cache
	find . -type d -name "__pycache__" -exec rm -rf {} +
	@echo "✓ Cleaned generated files"

logs:
	docker compose -f docker/docker-compose.yml logs -f

docker-test:
	docker compose -f docker/docker-compose.yml exec backend pytest -v
