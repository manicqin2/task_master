# Implementation Plan: Update Deployment Script for Gemini Migration

**Branch**: `007-update-deployment` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-update-deployment/spec.md`

## Summary

Update the deployment script (`deploy.sh`) to replace all Ollama references with Gemini API configuration following the Feature 006 migration. The script currently references Ollama environment variables, performs Ollama health checks, and displays Ollama-specific deployment guidance. This update ensures the deployment process matches the current system architecture using Gemini API for task enrichment and metadata extraction.

**Primary Requirement**: Remove all Ollama references and add Gemini configuration validation throughout deploy.sh

**Technical Approach**: Direct script modification - find/replace Ollama variables with Gemini equivalents, remove Ollama health check loops, update environment file templates, and revise deployment messages.

## Technical Context

**Language/Version**: Bash 4.0+ (compatible with macOS and Linux)
**Primary Dependencies**:
- docker compose (v2.x)
- curl (for health checks)
- Standard bash utilities (grep, sed, cat)

**Storage**: N/A (script only modifies deployment workflow)
**Testing**: Manual execution testing (development and production modes)
**Target Platform**:
- Development: macOS/Linux workstations
- Production: Linux VPS (Ubuntu/Debian)

**Project Type**: Infrastructure/DevOps script (single file modification)
**Performance Goals**:
- Deployment completes in <3 minutes (improved from 5+ with Ollama)
- Health check validation <30 seconds (reduced from 2+ minutes)

**Constraints**:
- Must maintain backward compatibility with existing .env files that have Gemini config
- Must not break production deployments
- Must work with both development and production compose files

**Scale/Scope**:
- Single file modification (deploy.sh, ~200 lines)
- Environment file template updates (.env.development auto-creation)
- No code changes to backend/frontend required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Library-First Architecture: ✅ PASS (Not Applicable)
- **Rationale**: This is a standalone deployment script, not a library or application feature. No library structure required.

### Test-Driven Development: ✅ PASS (Adapted)
- **Status**: TDD adapted for shell script infrastructure
- **Testing Approach**:
  - Manual testing: Execute deploy.sh in development and production modes
  - Validation: Verify Ollama references removed, Gemini validation works, health checks pass
  - Test scenarios cover all edge cases from spec (missing API key, invalid format, etc.)
- **Rationale**: Shell scripts benefit from manual integration testing more than unit tests. Automated tests would require test frameworks (bats, shunit2) which add complexity for minimal gain.

### Clean Modular Architecture: ✅ PASS (Not Applicable)
- **Rationale**: Single-purpose shell script with clear sequential flow. No module boundaries or architectural concerns.

### Visual Documentation Standards: ⚠️ OPTIONAL
- **Status**: Diagrams not required for this feature
- **Rationale**: Feature is a script modification, not a new system component. Existing deployment flow diagrams in docker-compose.yml and Feature 006 architecture.md cover the runtime architecture. No new architectural patterns introduced.
- **Decision**: Skip architecture.md creation - changes are mechanical find/replace operations with no new architectural decisions.

**Overall Constitution Compliance**: ✅ PASS - All applicable principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/007-update-deployment/
├── spec.md              # Feature specification (completed by /speckit.specify)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (migration guidance)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

**Note**: No `contracts/`, `data-model.md`, or `quickstart.md` needed - this feature modifies existing deployment infrastructure, not application code.

### Source Code (repository root)

```text
/                        # Repository root
├── deploy.sh            # PRIMARY TARGET - deployment script to update
├── .env.development     # Template auto-created by deploy.sh (update defaults)
├── .env.production.example  # Template for production (update example values)
└── docker/
    ├── docker-compose.yml      # Development compose file (already updated in Feature 006)
    └── docker-compose.prod.yml # Production compose file (if exists, verify compatibility)
```

**Structure Decision**: No new files created. All changes modify existing deployment infrastructure in-place. The deploy.sh script is a standalone utility at repository root, following common DevOps patterns.

## Complexity Tracking

**No constitutional violations** - all changes are straightforward script maintenance with no architectural complexity.

---

## Phase 0: Outline & Research

### Research Tasks

Since this is a script migration following Feature 006's architectural changes, research focuses on best practices for deployment script validation and error messaging.

**Research Questions**:
1. What are best practices for validating API keys in bash scripts?
2. How should deployment scripts provide actionable error messages for missing configuration?
3. What health check patterns work best for cloud API dependencies (vs. local services like Ollama)?
4. How to handle environment file auto-creation securely?

**Output**: `research.md` documenting:
- Bash validation patterns for API keys (format checking, presence validation)
- Error message templates for missing/invalid Gemini API keys
- Health check simplification strategies (removed Ollama wait loops)
- Secure defaults for auto-generated environment files

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### Design Decisions

**No new design artifacts needed** - this feature implements mechanical changes to existing deployment script:

1. **Environment Variable Mapping**:
   - `OLLAMA_BASE_URL` → Remove (no longer used)
   - `OLLAMA_MODEL` → Remove (no longer used)
   - `OLLAMA_TIMEOUT` → Remove (no longer used)
   - Add validation for: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT`, `GEMINI_MAX_RETRIES`

2. **Health Check Updates**:
   - Remove Ollama model loading check (lines 142-154 in current deploy.sh)
   - Keep backend health check (already validates Gemini integration indirectly)
   - Update wait times (2-minute Ollama wait → 30-second backend startup)

3. **Message Updates**:
   - Configuration display: Show Gemini model instead of Ollama model
   - Post-deployment: Reference Gemini latency (~1-2s) instead of Ollama model loading
   - Troubleshooting: Remove ollama-init container references
   - Volume info: Remove ollama_data reference

**No contracts, data models, or quickstart guides needed** - deployment script has no API surface or data structures.

### Agent Context Update

After planning is complete, update agent context with deployment script changes:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This captures the Gemini migration deployment pattern for future reference.

---

## Phase 2: Task Breakdown

**Not performed by /speckit.plan** - run `/speckit.tasks` separately to generate task list.

**Estimated task count**: 8-12 tasks covering:
- Update environment variable validation
- Remove Ollama health checks
- Update .env.development template
- Update configuration display messages
- Update post-deployment messages
- Update troubleshooting guidance
- Manual testing (development mode)
- Manual testing (production mode)
- Update .env.production.example

---

## Success Metrics (from spec.md)

- **SC-001**: Users deploy without Ollama errors/warnings (100% success rate)
- **SC-002**: Deployment completes in <3 minutes (improved from 5+)
- **SC-003**: 100% of Ollama references removed from output
- **SC-004**: First-time deployment succeeds without external docs
- **SC-005**: Health checks complete in <30 seconds (reduced from 2+)

---

## Notes

This is a **maintenance feature** following Feature 006's Gemini migration. Changes are mechanical and low-risk:
- No new features added to the deployment process
- No breaking changes to deployment workflow
- Existing .env files with Gemini config continue working
- Only user-facing changes are improved messages and faster deployment

**Risk Assessment**: **LOW** - Script changes are isolated, easily tested, and reversible if issues arise.
