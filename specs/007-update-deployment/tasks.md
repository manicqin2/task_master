# Tasks: Update Deployment Script for Gemini Migration

**Input**: Design documents from `/specs/007-update-deployment/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Tests**: No automated tests for shell script - manual testing only (per constitution TDD adaptation)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All changes modify existing files at repository root:
- `deploy.sh` - primary deployment script (~200 lines)
- `.env.development` - auto-created by deploy.sh (template updated)
- `.env.production.example` - production template

---

## Phase 1: Setup (Backup & Preparation)

**Purpose**: Prepare for deployment script modifications

- [ ] T001 Create backup of current deploy.sh as deploy.sh.bak
- [ ] T002 Review current deploy.sh to identify all Ollama references (lines 65-73, 86-92, 142-154, 189, 198-199)

---

## Phase 2: User Story 1 - Deploy System with Gemini Configuration (Priority: P1) 🎯 MVP

**Goal**: Update deploy.sh to validate Gemini API configuration and remove Ollama references

**Independent Test**: Run `bash deploy.sh development` and verify: (1) no Ollama errors, (2) GEMINI_API_KEY validated, (3) system starts with Gemini config, (4) health checks pass without Ollama checks

### Implementation for User Story 1

- [ ] T003 [US1] Remove OLLAMA_MODEL, OLLAMA_TIMEOUT references from configuration display (lines 86-92) in deploy.sh
- [ ] T004 [US1] Add GEMINI_MODEL, GEMINI_TIMEOUT, GEMINI_MAX_RETRIES to configuration display (lines 86-92) in deploy.sh
- [ ] T005 [US1] Remove Ollama health check section entirely (lines 142-154) in deploy.sh
- [ ] T006 [US1] Update backend health check message to reference Gemini validation in deploy.sh
- [ ] T007 [US1] Remove ollama-init container references from troubleshooting output (line ~151) in deploy.sh
- [ ] T008 [US1] Remove ollama_data volume reference from deployment summary (line 189) in deploy.sh

**Checkpoint**: US1 Complete - Deployment script removes all Ollama references and works with Gemini configuration

---

## Phase 3: User Story 2 - Create Environment Files with Gemini Defaults (Priority: P2)

**Goal**: Auto-create .env.development with Gemini configuration defaults

**Independent Test**: Remove .env.development and run deploy.sh, verify it creates valid file with GEMINI_API_KEY placeholder and correct defaults

### Implementation for User Story 2

- [ ] T009 [US2] Update .env.development auto-creation template (lines 65-73) to remove OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT in deploy.sh
- [ ] T010 [US2] Add GEMINI_API_KEY=your_gemini_api_key_here placeholder to .env.development template in deploy.sh
- [ ] T011 [US2] Add GEMINI_MODEL=gemini-2.5-flash to .env.development template in deploy.sh
- [ ] T012 [US2] Add GEMINI_TIMEOUT=15.0 to .env.development template in deploy.sh
- [ ] T013 [US2] Add GEMINI_MAX_RETRIES=3 to .env.development template in deploy.sh
- [ ] T014 [US2] Add warning message after .env.development creation: "⚠️ IMPORTANT: Update GEMINI_API_KEY with your actual API key" in deploy.sh
- [ ] T015 [P] [US2] Verify .env.production.example contains GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT, GEMINI_MAX_RETRIES

**Checkpoint**: US2 Complete - Script auto-creates .env.development with Gemini defaults

---

## Phase 4: User Story 3 - Display Correct Deployment Guidance (Priority: P3)

**Goal**: Update all deployment messages to reference Gemini instead of Ollama

**Independent Test**: Complete deployment and verify all messages reference Gemini

### Implementation for User Story 3

- [ ] T016 [US3] Update post-deployment warning about first enrichment (lines 198-199) to reference Gemini latency (~1-2s) instead of Ollama model loading in deploy.sh
- [ ] T017 [US3] Update "Useful Commands" section to remove ollama-init references in deploy.sh
- [ ] T018 [US3] Update deployment summary to show Gemini configuration instead of Ollama settings in deploy.sh

**Checkpoint**: US3 Complete - All deployment messages accurate for Gemini architecture

---

## Phase 5: Validation & Testing

**Purpose**: Manual testing to verify all acceptance criteria

- [ ] T019 Manual test: Deploy development with missing GEMINI_API_KEY (expect clear error + instructions)
- [ ] T020 Manual test: Deploy development with placeholder GEMINI_API_KEY (expect error on first API call, backend health check fail)
- [ ] T021 Manual test: Deploy development with valid GEMINI_API_KEY (expect successful deployment, backend healthy)
- [ ] T022 Manual test: Verify no Ollama references in script output (grep deploy.sh output for "ollama", "Ollama", "OLLAMA" - expect zero matches)
- [ ] T023 Manual test: Measure deployment time development mode (expect <3 minutes)
- [ ] T024 Manual test: Verify backend health check completes <30 seconds
- [ ] T025 Manual test: Test production mode error handling (.env.production missing - expect clear instructions)
- [ ] T026 Manual test: Verify existing .env files with Gemini config work unchanged

---

## Phase 6: Polish & Documentation

**Purpose**: Finalize deployment script updates

- [ ] T027 Add comment header to deploy.sh documenting Gemini migration (date, feature 007)
- [ ] T028 Update any inline comments referencing Ollama to reference Gemini in deploy.sh
- [ ] T029 Remove deploy.sh.bak after successful testing
- [ ] T030 Update .env.production.example if needed to include helpful comments for GEMINI_API_KEY setup

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

**Minimum Viable Product**: Tasks T001-T008
- Removes all Ollama references
- Allows deployment to succeed without Ollama errors
- Users can deploy with existing Gemini configuration

**Validation**: `bash deploy.sh development` completes without Ollama errors

---

### Incremental Delivery Path

**Phase 1 (MVP)**: US1 - Core Gemini Deployment (T001-T008)
- **Delivers**: Deployment script that works with Gemini
- **Test**: Successful development deployment

**Phase 2**: US2 - Auto-create Environment Files (T009-T015)
- **Delivers**: Improved first-time user experience
- **Test**: Script creates .env.development automatically

**Phase 3**: US3 - Accurate Messaging (T016-T018)
- **Delivers**: Clear, helpful deployment guidance
- **Test**: No confusing or outdated messages

**Final**: Validation & Polish (T019-T030)
- **Delivers**: Fully tested, documented deployment script
- **Test**: All acceptance criteria pass

---

## Dependencies

### User Story Completion Order

```
US1 (Deploy with Gemini) → US2 (Auto-create env files) → US3 (Update messages)
         ↓                            ↓                           ↓
    Foundation              Enhancement               Polish
```

**Independence**: Each user story can be implemented and tested independently after US1 foundation

---

## Parallel Execution Opportunities

### Within User Story 1 (Foundation)
```bash
# Can run in parallel (different sections of deploy.sh):
T003-T004  # Update config display
T005-T006  # Update health checks
T007-T008  # Update troubleshooting/summary messages
```

### Within User Story 2 (Environment Files)
```bash
# Can run in parallel (independent changes):
T009-T014  # Update .env.development template (sequential within, but parallel to T015)
T015       # Verify .env.production.example (independent)
```

### Within User Story 3 (Messages)
```bash
# Can run in parallel (different sections):
T016  # Update performance warnings
T017  # Update useful commands
T018  # Update deployment summary
```

### Validation Phase
```bash
# Must run sequentially (tests build on each other):
T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026
```

---

## Task Breakdown Summary

**Total Tasks**: 30
- Setup: 2 tasks
- US1 (P1 - MVP): 6 tasks
- US2 (P2): 7 tasks
- US3 (P3): 3 tasks
- Validation: 8 tasks (manual testing)
- Polish: 4 tasks

**Parallel Opportunities**: 12 tasks can run in parallel (marked with [P])

**Independent Testing**:
- US1: Deploy development successfully with Gemini
- US2: Auto-create .env.development with correct defaults
- US3: All messages reference Gemini (no Ollama mentions)

**Suggested MVP**: US1 only (T001-T008) = 8 tasks, enables basic Gemini deployment
