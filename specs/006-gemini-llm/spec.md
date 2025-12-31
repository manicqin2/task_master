# Feature Specification: Replace Ollama with Gemini API (gemini-2.5-flash)

**Feature Branch**: `006-gemini-llm`
**Created**: 2025-12-26
**Status**: Draft
**Input**: User description: "add gemini 3 as the llm instead of ollama"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Task Enrichment with Gemini API (Priority: P1)

As a task master user, I want my tasks to be enriched by Gemini API (gemini-2.5-flash model) so that I get high-quality metadata extraction without running local infrastructure.

**Why this priority**: This is the core functionality - replacing the LLM provider while maintaining all existing task enrichment capabilities. Without this, the feature provides no value.

**Independent Test**: Can be fully tested by creating a task through the UI, verifying it gets enriched with metadata (project, persons, deadline, etc.), and confirming the enrichment was performed by Gemini API instead of Ollama.

**Acceptance Scenarios**:

1. **Given** I have configured Gemini API credentials, **When** I create a new task "Call John tomorrow about project Alpha", **Then** the task is enriched with extracted metadata (person: John, deadline: tomorrow, project suggestion)
2. **Given** I submit a task for enrichment, **When** Gemini API processes the request, **Then** the enrichment completes within the configured timeout (default 15 seconds)
3. **Given** the task enrichment service is running, **When** I check the system configuration, **Then** I can verify that Gemini API is the active LLM provider (not Ollama)

---

### User Story 2 - Seamless Migration from Ollama (Priority: P2)

As a system administrator, I want to migrate from Ollama to Gemini API without losing existing data or requiring complex manual steps.

**Why this priority**: Ensures smooth adoption for existing users. Not P1 because the feature can work for new installations without migration support.

**Independent Test**: Can be tested by deploying the updated system to an environment with existing Ollama-enriched tasks, verifying all old tasks remain accessible and new tasks use Gemini API.

**Acceptance Scenarios**:

1. **Given** I have existing tasks enriched by Ollama, **When** I deploy the Gemini API update, **Then** all existing tasks remain accessible with their original enrichment data
2. **Given** I deploy the updated system, **When** the system starts, **Then** I receive confirmation that Gemini API is configured and ready (no Ollama dependency errors)
3. **Given** I am running the system with Gemini API, **When** I check the deployment configuration, **Then** Ollama containers/services are no longer required or running

---

### User Story 3 - Error Handling and Fallback (Priority: P3)

As a user, I want clear feedback when Gemini API enrichment fails so I can understand what went wrong and retry if needed.

**Why this priority**: Important for user experience but not blocking - the system can function with basic error messages initially.

**Independent Test**: Can be tested by simulating API failures (invalid credentials, rate limits, network errors) and verifying appropriate error messages are shown.

**Acceptance Scenarios**:

1. **Given** Gemini API credentials are invalid, **When** I create a task, **Then** I see a clear error message indicating authentication failure with Gemini API
2. **Given** Gemini API rate limits are exceeded, **When** a task enrichment fails, **Then** the task is marked as "needs attention" with an actionable error message
3. **Given** Gemini API is temporarily unavailable, **When** enrichment fails, **Then** I can manually retry the enrichment from the UI

---

### Edge Cases

- What happens when Gemini API keys are missing or invalid at startup?
- How does the system handle Gemini API rate limiting during high-volume task creation?
- What if Gemini API returns malformed responses that don't match the expected schema?
- How are costs tracked and monitored when using a paid API service vs. local Ollama?
- What happens if Gemini API response times exceed the configured timeout?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use Gemini API (gemini-2.5-flash model) for all task enrichment operations (replacing Ollama)
- **FR-002**: System MUST authenticate with Gemini API using API credentials configured via environment variables
- **FR-003**: System MUST extract the same metadata fields from tasks using Gemini API as it previously did with Ollama (project, persons, task_type, priority, deadline, effort_estimate, dependencies, tags)
- **FR-004**: System MUST maintain the same enrichment workflow (pending → processing → completed/failed) with Gemini API
- **FR-005**: System MUST handle Gemini API errors gracefully and mark tasks as failed with descriptive error messages
- **FR-006**: System MUST support configurable timeout for Gemini API requests (default 15 seconds, based on API best practices)
- **FR-007**: System MUST NOT require Ollama containers or services to be running after migration
- **FR-008**: System MUST preserve all existing task data when migrating from Ollama to Gemini API
- **FR-009**: System MUST validate Gemini API credentials at startup and fail fast with clear error messages if invalid
- **FR-010**: System MUST log Gemini API usage for monitoring and cost tracking purposes

### Key Entities

- **LLM Configuration**: Stores API credentials, model name, timeout settings, and endpoint URLs for Gemini API
- **Enrichment Request**: Contains task text, requested metadata fields, and configuration for the LLM call
- **Enrichment Response**: Contains extracted metadata, confidence scores, and chain-of-thought reasoning from Gemini API

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tasks are enriched with metadata in <1.5 seconds average latency, <5 seconds p95 latency (improving Ollama's 2-4s average)
- **SC-002**: System successfully enriches 99% of tasks without errors under normal API conditions
- **SC-003**: Deployment complexity is reduced - no Docker volumes or model downloads required (Ollama removal)
- **SC-004**: API costs remain predictable - average enrichment cost per task is documented and monitored
- **SC-005**: Migration from Ollama to Gemini API completes without data loss - 100% of existing tasks remain accessible
