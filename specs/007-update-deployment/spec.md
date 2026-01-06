# Feature Specification: Update Deployment Script for Gemini Migration

**Feature Branch**: `007-update-deployment`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "update deployment script after last changes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy System with Gemini Configuration (Priority: P1)

As a system administrator, I want to deploy the Task Master application with Gemini API configuration instead of Ollama, so that the deployment script reflects the current architecture and provides appropriate guidance.

**Why this priority**: This is critical because the deployment script currently references Ollama which has been removed. Users deploying the system will encounter errors and confusion if the script doesn't match the current architecture.

**Independent Test**: Can be fully tested by running `bash deploy.sh development` and verifying that: (1) no Ollama-related errors occur, (2) GEMINI_API_KEY is validated, (3) system starts successfully with Gemini configuration, and (4) health checks pass without Ollama checks.

**Acceptance Scenarios**:

1. **Given** I run deploy.sh with development environment, **When** the script validates environment variables, **Then** it checks for GEMINI_API_KEY instead of OLLAMA_BASE_URL
2. **Given** GEMINI_API_KEY is missing from environment, **When** deploy.sh runs, **Then** the script displays an error with instructions to set the API key
3. **Given** I deploy successfully, **When** checking the deployment summary, **Then** it displays Gemini model and configuration instead of Ollama settings
4. **Given** deployment completes, **When** viewing useful commands, **Then** all references to Ollama containers/services are removed

---

### User Story 2 - Create Environment Files with Gemini Defaults (Priority: P2)

As a first-time deployer, I want the deployment script to automatically create environment files with Gemini defaults, so that I can quickly get started without manual configuration.

**Why this priority**: Important for user experience but not blocking - users can manually create env files if needed.

**Independent Test**: Can be tested by removing .env.development and running deploy.sh, verifying that it creates a valid .env.development with GEMINI_API_KEY placeholder and correct defaults.

**Acceptance Scenarios**:

1. **Given** .env.development does not exist, **When** I run deploy.sh development, **Then** the script creates .env.development with GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT, and GEMINI_MAX_RETRIES
2. **Given** .env.production does not exist, **When** I run deploy.sh production, **Then** the script provides clear instructions to create it from .env.production.example
3. **Given** environment file is created, **When** I review it, **Then** sensible defaults are set (gemini-2.5-flash model, 15s timeout, 3 retries)

---

### User Story 3 - Display Correct Deployment Guidance (Priority: P3)

As a user completing deployment, I want to see accurate post-deployment messages that reflect the Gemini architecture, so that I understand what's running and what to expect.

**Why this priority**: Improves user experience but doesn't affect functionality - system works regardless of message accuracy.

**Independent Test**: Can be tested by completing a deployment and verifying that all displayed messages, warnings, and tips reference Gemini instead of Ollama.

**Acceptance Scenarios**:

1. **Given** deployment completes successfully, **When** viewing the summary, **Then** messages reference Gemini API latency (~1-2s) instead of Ollama model loading
2. **Given** deployment configuration is displayed, **When** reviewing settings, **Then** Gemini model and timeout are shown instead of Ollama model
3. **Given** troubleshooting guidance is shown, **When** reading useful commands, **Then** no references to ollama-init or Ollama containers appear

---

### Edge Cases

- What happens when GEMINI_API_KEY is not set in environment?
- How does the script handle missing .env.production.example file?
- What if the Gemini API key format is invalid (doesn't start with "AIza")?
- How should the script behave if docker compose is not installed?
- What happens when attempting to check non-existent Ollama containers?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Deployment script MUST validate GEMINI_API_KEY presence instead of OLLAMA_BASE_URL
- **FR-002**: Script MUST remove all Ollama-specific health checks and status monitoring
- **FR-003**: Script MUST create .env.development with Gemini defaults (GEMINI_API_KEY, GEMINI_MODEL=gemini-2.5-flash, GEMINI_TIMEOUT=15.0, GEMINI_MAX_RETRIES=3) when file doesn't exist
- **FR-004**: Script MUST display Gemini configuration (model, timeout, retries) instead of Ollama settings in deployment summary
- **FR-005**: Script MUST remove references to ollama-data Docker volume from informational messages
- **FR-006**: Script MUST update post-deployment messages to reference Gemini API latency expectations instead of Ollama model loading
- **FR-007**: Script MUST remove "Checking Ollama..." health check section entirely
- **FR-008**: Script MUST provide clear error message when GEMINI_API_KEY is missing with instructions to obtain key from https://aistudio.google.com/
- **FR-009**: Useful commands section MUST NOT reference ollama-init or Ollama-related containers
- **FR-010**: Script MUST work with existing docker-compose.yml that no longer includes Ollama services

### Key Entities

- **Environment File**: Configuration file (.env.development or .env.production) containing Gemini API credentials and settings
- **Deployment Configuration**: Runtime settings including Gemini model name, timeout, retry count, and API key
- **Health Check**: Backend service validation (Gemini-related Ollama checks removed)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully deploy the system without any Ollama-related errors or warnings
- **SC-002**: Deployment script completes in under 3 minutes for development environment (improved from 5+ minutes due to Ollama model download removal)
- **SC-003**: 100% of Ollama references are removed from deployment script output messages
- **SC-004**: First-time users can deploy successfully by following on-screen instructions without requiring external documentation
- **SC-005**: Health check validation completes in under 30 seconds (reduced from 2+ minutes without Ollama model loading wait)
