# Mission Statement: Task Master

## Project Overview

**Project Name:** Task Master

**Vision:**
A local-first, intelligent task management web application that transforms casual notes and quick thoughts into structured, actionable tasks through AI-powered enrichment and contextual understanding.

**Core Purpose:**
Enable users to capture fleeting thoughts and reminders in natural language, which are automatically enriched with context, categorization, and relationships—eliminating the mental overhead of manual task organization.

---

## Key Capabilities

### 1. Natural Language Input Processing
- Accept raw, unstructured messages in conversational form
- Parse context clues (dates, names, project identifiers, urgency)
- Preserve original input alongside enriched version

### 2. Intelligent Task Enrichment
- Extract and structure metadata (projects, people, deadlines, tags)
- Reformat messages into clear, actionable statements
- Identify task type, priority, and relationships automatically

### 3. Context-Aware RAG System
- Maintain searchable vector database of historical tasks
- Surface similar past tasks for pattern recognition
- Use task history to improve classification accuracy over time

### 4. Interactive Clarification
- LLM can ask follow-up questions when context is ambiguous
- Conversational refinement of task details
- Learn user patterns and preferences through interaction

### 5. Local-First Architecture
- All data stored locally for privacy and speed
- No external dependencies for core functionality
- Offline-capable with optional cloud sync

---

## Example Transformations

### Example 1: Personal Task
**Input:**
```
"call mom talk trip tomorrow"
```

**Output:**
```json
{
  "project": "personal",
  "persons": ["mom"],
  "deadline": "2025-11-05",
  "original": "call mom talk trip tomorrow",
  "formatted": "Call mom to discuss trip plans",
  "taskType": "communication",
  "priority": "medium"
}
```

### Example 2: Development Task
**Input:**
```
"napp-2511 refactor manager class"
```

**Output:**
```json
{
  "project": "napp-2511",
  "persons": [],
  "deadline": null,
  "original": "napp-2511 refactor manager class",
  "formatted": "Refactor Manager class in NAPP-2511 project",
  "taskType": "development",
  "priority": "normal"
}
```

---

## Success Criteria

- **Speed:** Reduce task entry time from 2-3 minutes to under 10 seconds
- **Accuracy:** Achieve 90%+ accuracy in context extraction without clarification
- **Flow:** Enable quick capture without breaking user flow or concentration
- **Intelligence:** Build searchable task history that improves insights over time

---

## Technical Documentation

- **Technology Stack**: See [docs/tech-stack.md](docs/tech-stack.md) for complete technical stack details
- **Constitution**: See [.specify/memory/constitution.md](.specify/memory/constitution.md) for development principles and standards

---

## Implementation Status

### ✅ Feature 001: Chat-Based Task Entry (COMPLETE)

The first feature has been fully implemented! This provides:
- **Chat-style task input** with automatic enrichment
- **Async background processing** using Ollama LLM
- **Real-time polling** for enrichment status updates
- **Persistent task storage** with SQLite
- **Docker deployment** for cross-platform compatibility

**Quick Start:**

```bash
# Navigate to project root
cd task_master

# Start all services with Docker Compose
docker compose -f docker/docker-compose.yml up

# Access the application
open http://localhost:3000
```

**Note:** On first run, Docker will automatically pull the `llama3.2` model (2GB). This may take a few minutes depending on your internet connection. The backend won't start until the model is ready.

**What's Working:**
- Type informal tasks like "call mom tmrw"
- Watch them get enriched to "Call Mom tomorrow to discuss weekend plans"
- Submit multiple tasks without waiting
- Tasks persist across page refreshes
- Failed enrichments show error messages

**Documentation:**
- Feature Spec: `specs/001-chat-task-entry/spec.md`
- Implementation Plan: `specs/001-chat-task-entry/plan.md`
- Quick Start Guide: `specs/001-chat-task-entry/quickstart.md`
- API Docs: http://localhost:8000/docs (when running)

### 🚧 Next Features

Future features will build on this foundation to add:
- Metadata extraction (dates, people, projects)
- RAG-based task search and recommendations
- Interactive LLM clarification
- Task relationships and dependencies

## Development

### Quick Start

**Docker (Recommended):**
```bash
docker compose -f docker/docker-compose.yml up
```

**Local Development with mise + uv:**
```bash
# Install mise (manages Python/Node versions automatically)
brew install mise  # macOS
# or: curl https://mise.run | sh

# Install uv (10-100x faster than pip)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Navigate to project (mise auto-activates!)
cd task_master

# Option 1: Use Make (built-in)
make install      # Install all dependencies
make dev-backend  # Run backend
make dev-frontend # Run frontend (in new terminal)
make test         # Run all tests

# Option 2: Use Just (install: brew install just)
just install      # Install all dependencies
just dev-backend  # Run backend
just dev-frontend # Run frontend (in new terminal)
just test         # Run all tests

# Option 3: Manual
cd backend && uv pip install -e .[dev]
uvicorn src.main:app --reload
```

**Why mise + uv?**
- ✅ **mise**: Automatic Python/Node version management + venv activation
- ✅ **uv**: 10-100x faster Python package installation
- ✅ No manual venv activation needed
- ✅ Reproducible development environments

### Documentation

- **Local Development Guide**: `docs/local-development.md` (mise + uv setup)
- **Quick Start**: `specs/001-chat-task-entry/quickstart.md` (Docker)
- **API Documentation**: http://localhost:8000/docs (when running)