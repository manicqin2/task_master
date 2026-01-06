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

#### EC-001: Missing or Invalid API Keys at Startup
**Acceptance Criteria:**
1. **Given** GEMINI_API_KEY environment variable is not set, **When** backend container starts, **Then** system exits with code 1 and logs error "GEMINI_API_KEY environment variable is required"
2. **Given** GEMINI_API_KEY is invalid (wrong format or revoked), **When** first task enrichment is attempted, **Then** task fails with error "Gemini API authentication failed. Please check your API key." and is moved to "More Info" lane
3. **Given** API key validation fails, **When** checking startup logs, **Then** error message clearly identifies the configuration issue

**Validating Tasks:** T025 (unit test), T026 (implementation), T040 (integration test validation)

---

#### EC-002: Rate Limiting During High-Volume Task Creation
**Acceptance Criteria:**
1. **Given** system is on free tier (10 RPM limit), **When** 15 tasks are submitted in <60 seconds, **Then** 10 tasks succeed immediately and 5 tasks are retried with exponential backoff (1s, 2s, 4s delays)
2. **Given** a task receives 429 error, **When** max retries (3) are exhausted, **Then** task is marked as failed with error "Rate limit exceeded after 3 retries. Please wait 1 minute and retry manually." and moved to "More Info" lane
3. **Given** rate limiting is detected, **When** user views task workbench, **Then** user sees clear message "Rate limit exceeded. Retrying automatically..." while task is in retry loop

**Validating Tasks:** T042 (unit test for 429 handling), T047 (error message implementation), T052 (integration test validation)

**Mitigation:** Upgrade to paid tier for production use; implement request queuing with rate limiting

---

#### EC-003: Malformed Responses from Gemini API
**Acceptance Criteria:**
1. **Given** Gemini API returns response without required fields, **When** Pydantic schema validation runs, **Then** ValidationError is raised and task is marked as failed with error "Invalid response format from Gemini API"
2. **Given** Gemini API returns empty response (response.text is empty), **When** enrichment completes, **Then** system raises ValueError("Gemini returned empty response") and marks task as failed
3. **Given** Gemini API returns malformed JSON, **When** parsing `response.parsed`, **Then** JSONDecodeError is caught and task is marked as failed with error "Failed to parse Gemini response"

**Validating Tasks:** T014 (extract_metadata implementation with Pydantic validation), T052 (error handling validation)

**Note:** Pydantic's `response_schema` parameter provides automatic validation; failures are caught in `try/except` block in `GeminiClient.extract_metadata()`

---

#### EC-004: Cost Tracking and Monitoring
**Acceptance Criteria:**
1. **Given** a task is enriched, **When** Gemini API call completes, **Then** system logs structured message: `Gemini API usage: task_id={id}, input_tokens={X}, output_tokens={Y}, estimated_cost=${Z}`
2. **Given** system runs for 7 days, **When** reviewing logs, **Then** weekly cost summary is available showing total requests, total tokens, estimated cost, and average cost per task
3. **Given** daily cost exceeds $1.00, **When** log monitoring runs, **Then** WARNING log is emitted: "Gemini API daily cost exceeded $1.00 threshold"

**Validating Tasks:** T020 (usage logging implementation), T059 (performance monitoring), T060 (cost tracking)

**Monitoring Strategy:** Parse logs for cost data; optional: export to Prometheus for alerting

---

#### EC-005: Request Timeout Exceeding Configured Limit
**Acceptance Criteria:**
1. **Given** GEMINI_TIMEOUT is set to 15 seconds, **When** Gemini API does not respond within 15 seconds, **Then** SDK raises TimeoutError and system retries with exponential backoff (max 3 attempts)
2. **Given** timeout occurs on 3rd retry attempt, **When** max retries are exhausted, **Then** task is marked as failed with error "Gemini API timeout after 3 retries (15s each)" and moved to "More Info" lane
3. **Given** timeout is transient, **When** retry succeeds on 2nd attempt, **Then** task completes successfully and logs show "Gemini API succeeded on retry 2 after timeout"

**Validating Tasks:** T006 (timeout configuration validation), T044 (unit test for timeout handling), T049 (timeout error message implementation), T052 (integration test validation)

**Configuration:** Set GEMINI_TIMEOUT via environment variable (default: 15.0 seconds)

---

## Glossary

**Task Enrichment:** The process of improving raw user input by correcting spelling, expanding abbreviations, and making language clearer and more action-oriented (e.g., "call john tmrw" → "Call John tomorrow"). Implemented by `GeminiClient.enrich_task()` in `backend/src/lib/gemini_client.py`.

**Metadata Extraction:** The process of parsing structured data from task text, including person names, deadlines, projects, priority, task type, effort estimates, dependencies, and tags. Implemented by `GeminiClient.extract_metadata()` using Pydantic schemas. Always operates on enriched text (after enrichment step), not raw user input.

**Enrichment Workflow:** The complete end-to-end process for task creation: raw input → task enrichment → metadata extraction → database persistence. Workflow state is tracked via the `workbench` table using the `enrichment_status` field (pending → processing → completed/failed).

**Gemini API:** Google's cloud-based generative AI service used for both task enrichment and metadata extraction. Accessed via the `google-genai` Python SDK with model `gemini-2.5-flash`.

**Rate Limiting:** API request throttling enforced by Gemini API. Free tier: 10 RPM (requests per minute). System handles rate limits with exponential backoff retry logic (1s, 2s, 4s delays, max 3 retries).

---

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

- **SC-001**: Tasks are enriched with metadata in <1.5 seconds average latency, <5 seconds p95 latency (baseline: Ollama 1-3s average, 4-5s p95)
  - **Measurement:** Log enrichment_duration for each task; calculate rolling 24h average
  - **Threshold:** Alert if 24h average exceeds 1.5s OR p95 exceeds 5s

- **SC-002**: System successfully enriches 99% of tasks without errors under normal API conditions
  - **Measurement:** `(completed_tasks / total_tasks) * 100` over rolling 7-day window
  - **Threshold:** Alert if success rate drops below 99% for 24h period
  - **Exclusions:** User-initiated cancellations excluded from failure count

- **SC-003**: Deployment complexity is reduced - infrastructure footprint decreased by measurable amount
  - **Measurement:**
    - Docker containers: 4 → 3 (25% reduction)
    - Docker volumes: 2 → 1 (50% reduction)
    - Deployment steps: Reduced from 5 to 3 (no model download, no volume setup)
  - **Baseline:** Ollama deployment requires docker-compose up + model download (~2GB, 5-10 min)
  - **Target:** Gemini deployment requires docker-compose up only (~30 sec)

- **SC-004**: API costs remain predictable and within acceptable bounds
  - **Measurement:** Track daily API usage via logging (input tokens, output tokens, request count)
  - **Cost Formula:** `(input_tokens * $0.10 / 1M) + (output_tokens * $0.40 / 1M)`
  - **Baseline Estimate:**
    - Average task: 200 input tokens + 100 output tokens = $0.00006 per task
    - Expected usage: 10,000 tasks/month = $0.60/month
  - **Thresholds:**
    - **ALERT:** Daily cost exceeds $1.00 (indicates unusual spike)
    - **WARNING:** Monthly projected cost exceeds $5.00 (30-day rolling average)
    - **SUCCESS:** Monthly cost variance < 30% month-over-month (predictable spending)
  - **Monitoring:** Log token counts per task; weekly cost report in logs

- **SC-005**: Migration from Ollama to Gemini API completes without data loss
  - **Measurement:**
    - Pre-migration: `SELECT COUNT(*) FROM tasks` (baseline count)
    - Post-migration: `SELECT COUNT(*) FROM tasks` (must equal baseline)
    - Enriched tasks preserved: `SELECT COUNT(*) FROM tasks WHERE enriched_text IS NOT NULL` (must equal pre-migration count)
  - **Threshold:** 100% of existing tasks remain accessible (zero data loss tolerance)
  - **Validation:** Integration test T024 validates old tasks accessible + new tasks use Gemini
