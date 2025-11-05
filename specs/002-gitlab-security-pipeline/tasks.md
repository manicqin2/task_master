# Tasks: GitLab Security Scanning Pipeline

**Input**: Design documents from `/specs/002-gitlab-security-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, architecture.md

**Tests**: This feature follows TDD via test commits (RED-GREEN-REFACTOR). Test commits with intentional security issues are created before implementing scanner configuration.

**Organization**: Tasks are grouped by user story (P1: Secret Detection, P2: Dependency Scanning, P3: SAST) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an infrastructure feature adding GitLab CI/CD configuration to the existing repository:
- **CI Configuration**: `.gitlab-ci.yml` at repository root
- **Policy Configuration**: `.gitlab/security-policies.yml`
- **Test Artifacts**: `tests/security/test-commits/` and `tests/security/expected-results/`
- **Existing Code**: `backend/`, `frontend/`, `docker/` (unchanged from Feature 001)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create directory structure and base configuration files

- [X] T001 Create security test directory structure at tests/security/
- [X] T002 [P] Create test-commits subdirectories: tests/security/test-commits/{secrets,dependencies,sast}/
- [X] T003 [P] Create expected-results directory at tests/security/expected-results/
- [X] T004 [P] Create .gitlab directory at repository root for policies
- [X] T005 Create base .gitlab-ci.yml with stages definition at repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base GitLab CI configuration that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Configure GitLab CI stages (test, security) in .gitlab-ci.yml
- [X] T007 [P] Add global variables for performance optimization in .gitlab-ci.yml (GIT_DEPTH, timeout settings)
- [X] T008 [P] Document GitLab tier requirements in .gitlab-ci.yml comments (Free vs Premium/Ultimate)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Secret Detection (Priority: P1) 🎯 MVP

**Goal**: Detect hardcoded secrets (API keys, passwords, tokens) in commits and block merge

**Independent Test**: Commit code with fake AWS API key → Pipeline fails → Report shows file:line location

### TDD: RED Phase (Create Failing Tests)

> **NOTE: Write these test commits FIRST, ensure pipeline FAILS before adding scanner**

- [X] T009 [P] [US1] Create test commit with fake AWS API key in tests/security/test-commits/secrets/aws-api-key.js
- [X] T010 [P] [US1] Create test commit with fake GitHub token in tests/security/test-commits/secrets/github-token.py
- [X] T011 [P] [US1] Create test commit with fake password in tests/security/test-commits/secrets/password-leak.js
- [X] T012 [P] [US1] Create false positive test (doc example) in tests/security/test-commits/secrets/false-positive.md
- [X] T013 [US1] Create expected findings JSON in tests/security/expected-results/secret-detection.json

### TDD: GREEN Phase (Make Tests Pass)

- [X] T014 [US1] Add Security/Secret-Detection.gitlab-ci.yml template include to .gitlab-ci.yml
- [X] T015 [US1] Configure secret_detection job in .gitlab-ci.yml (stage: security, performance settings)
- [X] T016 [US1] Set SECRET_DETECTION_HISTORIC_SCAN=false for performance in .gitlab-ci.yml
- [X] T017 [US1] Configure artifact output (gl-secret-detection-report.json) in .gitlab-ci.yml
- [X] T018 [US1] Set job to run on merge_requests and main branch in .gitlab-ci.yml
- [X] T019 [US1] Set allow_failure=false (blocking) for secret_detection job in .gitlab-ci.yml
- [X] T020 [US1] Test pipeline with secret test commits and verify detection

### TDD: REFACTOR Phase (Optimize)

- [X] T021 [US1] Add path exclusions (tests/,docs/) to SECRET_DETECTION_EXCLUDED_PATHS in .gitlab-ci.yml
- [X] T022 [US1] Create .gitleaksignore file at repository root for false positive handling
- [X] T023 [US1] Add documentation examples pattern to .gitleaksignore
- [X] T024 [US1] Verify false positive test commit no longer triggers detection
- [X] T025 [US1] Document secret detection configuration in .gitlab-ci.yml comments

**Checkpoint**: Secret detection fully functional - AWS/GitHub keys blocked, docs exempted, <90s scan time

---

## Phase 4: User Story 2 - Dependency Vulnerability Scanning (Priority: P2)

**Goal**: Detect known CVEs in npm and Python dependencies and block high/critical vulnerabilities

**Independent Test**: Add package with known CVE to package.json → Pipeline fails → Report shows CVE number and version

### TDD: RED Phase (Create Failing Tests)

- [X] T026 [P] [US2] Create vulnerable package.json with lodash@4.17.20 (CVE-2020-8203) in tests/security/test-commits/dependencies/vulnerable-package.json
- [X] T027 [P] [US2] Create vulnerable requirements.txt with known Python CVE in tests/security/test-commits/dependencies/vulnerable-requirements.txt
- [X] T028 [P] [US2] Create clean package.json (up-to-date dependencies) in tests/security/test-commits/dependencies/clean-package.json
- [X] T029 [US2] Create expected findings JSON in tests/security/expected-results/dependency-scanning.json

### TDD: GREEN Phase (Make Tests Pass)

- [X] T030 [US2] Add Security/Dependency-Scanning.gitlab-ci.yml template include to .gitlab-ci.yml
- [X] T031 [US2] Configure dependency_scanning job in .gitlab-ci.yml (stage: security)
- [X] T032 [US2] Configure artifact output (gl-dependency-scanning-report.json) in .gitlab-ci.yml
- [X] T033 [US2] Set job to run on merge_requests and main branch in .gitlab-ci.yml
- [X] T034 [US2] Set allow_failure=false (blocking) for dependency_scanning job in .gitlab-ci.yml
- [X] T035 [US2] Test pipeline with vulnerable test commits and verify CVE detection

### TDD: REFACTOR Phase (Optimize)

- [X] T036 [US2] Add path exclusions to DS_EXCLUDED_PATHS in .gitlab-ci.yml
- [X] T037 [US2] Configure timeout for dependency_scanning job (5 minutes) in .gitlab-ci.yml
- [X] T038 [US2] Verify clean dependencies test passes without blocking
- [X] T039 [US2] Document dependency scanning configuration and limitations (requires Ultimate) in .gitlab-ci.yml comments

**Checkpoint**: Dependency scanning functional - CVEs detected in npm/Python, clean deps pass, <120s scan time

---

## Phase 5: User Story 3 - Code Security Analysis (SAST) (Priority: P3)

**Goal**: Detect security anti-patterns (SQL injection, XSS, weak crypto) in source code with warning-only mode

**Independent Test**: Commit code with SQL injection pattern → Pipeline warns → Report shows file:line with remediation

### TDD: RED Phase (Create Failing Tests)

- [X] T040 [P] [US3] Create SQL injection test in tests/security/test-commits/sast/sql-injection.js
- [X] T041 [P] [US3] Create XSS vulnerability test in tests/security/test-commits/sast/xss-vulnerability.jsx
- [X] T042 [P] [US3] Create insecure crypto test in tests/security/test-commits/sast/insecure-crypto.py
- [X] T043 [P] [US3] Create secure code example (passes SAST) in tests/security/test-commits/sast/secure-example.py
- [X] T044 [US3] Create expected findings JSON in tests/security/expected-results/sast.json

### TDD: GREEN Phase (Make Tests Pass)

- [X] T045 [US3] Add Security/SAST.gitlab-ci.yml template include to .gitlab-ci.yml
- [X] T046 [US3] Configure sast job in .gitlab-ci.yml (stage: security)
- [X] T047 [US3] Set SAST_CONFIDENCE_LEVEL=HIGH in .gitlab-ci.yml
- [X] T048 [US3] Configure artifact output (gl-sast-report.json) in .gitlab-ci.yml
- [X] T049 [US3] Set job to run on merge_requests and main branch in .gitlab-ci.yml
- [X] T050 [US3] Set allow_failure=true (warning-only) for sast job in .gitlab-ci.yml
- [X] T051 [US3] Test pipeline with SAST test commits and verify detection

### TDD: REFACTOR Phase (Optimize)

- [X] T052 [US3] Add path exclusions (tests/,docs/) to SAST_EXCLUDED_PATHS in .gitlab-ci.yml
- [X] T053 [US3] Configure timeout for sast job (5 minutes) in .gitlab-ci.yml
- [X] T054 [US3] Verify secure code example passes without warnings
- [X] T055 [US3] Document SAST configuration and warning-only behavior in .gitlab-ci.yml comments

**Checkpoint**: SAST functional - SQL injection/XSS/crypto detected, secure code passes, warning-only, <180s scan time

---

## Phase 6: Security Dashboard Integration & Policies

**Goal**: Configure GitLab Security Dashboard integration and merge request blocking policies

**Independent Test**: Pipeline generates valid JSON reports → Dashboard ingests findings → Policies evaluated correctly

### Security Policy Configuration

- [X] T056 [P] Create .gitlab/security-policies.yml with schema_version and structure
- [X] T057 [P] Configure secret_detection_policy in .gitlab/security-policies.yml (critical/high block, medium/low warn)
- [X] T058 [P] Configure dependency_scanning_policy in .gitlab/security-policies.yml (critical/high block, medium require approval)
- [X] T059 [P] Configure sast_policy in .gitlab/security-policies.yml (critical/high require approval, medium/low warn)
- [X] T060 Configure global_settings in .gitlab/security-policies.yml (protected branches, notification settings)

### Report Schema Validation

- [X] T061 [P] Validate secret-detection report against GitLab schema v15.0.0 using contracts/security-report-schema.json
- [X] T062 [P] Validate dependency-scanning report against GitLab schema v15.0.0
- [X] T063 [P] Validate sast report against GitLab schema v15.0.0
- [X] T064 Verify all reports have required fields (version, scan, vulnerabilities)

### Dashboard Integration Testing

- [X] T065 Create test merge request with secret to verify pipeline failure
- [X] T066 Verify Security Dashboard ingests secret-detection findings
- [X] T067 Verify merge request blocked by policy for critical secret
- [X] T068 Create test merge request with vulnerable dependency to verify CVE reporting
- [X] T069 Verify Security Dashboard ingests dependency-scanning findings
- [X] T070 Create test merge request with SAST finding to verify warning-only behavior
- [X] T071 Verify Security Dashboard shows all scan types and severity levels

**Checkpoint**: Security Dashboard integrated - All scanners report to dashboard, policies enforce blocking rules

---

## Phase 7: Edge Case Handling

**Goal**: Handle edge cases from specification (gitignored files, binary files, false positives, scanner unavailable)

### Edge Case Tests

- [X] T072 [P] Test gitignored file accidentally staged (add .env with secret to .gitignore, verify detection)
- [X] T073 [P] Test large binary file handling (add exclusion pattern for *.bin, *.jpg)
- [X] T074 [P] Test vulnerability with no patch (add risk acceptance to policy for CVE with no fix)
- [X] T075 [P] Document false positive workflow in .gitlab-ci.yml comments (add to .gitleaksignore or policy exemption)
- [X] T076 Test scanner service unavailable (simulate timeout, verify allow_failure prevents block)

### Documentation Edge Cases

- [X] T077 Add comment in .gitlab-ci.yml explaining how to handle secrets in commit history (requires manual remediation, no automated fix)
- [X] T078 Document risk acceptance workflow in .gitlab/security-policies.yml comments
- [X] T079 Document exemption expiration handling in .gitlab/security-policies.yml

**Checkpoint**: Edge cases handled - False positives exempted, binary files excluded, errors documented

---

## Phase 8: Performance Optimization

**Goal**: Ensure all security scans complete within 5-minute performance target

### Performance Testing

- [ ] T080 Run full pipeline with all scanners in parallel and measure total duration
- [ ] T081 Verify secret detection completes in <90 seconds (measure with test commits)
- [ ] T082 Verify dependency scanning completes in <120 seconds
- [ ] T083 Verify SAST completes in <180 seconds
- [ ] T084 Verify parallel execution results in ~2-3 minute total time (not sum of individual jobs)

### Performance Tuning

- [ ] T085 Optimize secret detection: Verify differential scanning enabled (SECRET_DETECTION_HISTORIC_SCAN=false)
- [ ] T086 Optimize dependency scanning: Add DS_EXCLUDED_PATHS if needed
- [ ] T087 Optimize SAST: Verify confidence level tuned (SAST_CONFIDENCE_LEVEL=2)
- [ ] T088 Document performance optimization strategies in .gitlab-ci.yml comments

**Checkpoint**: Performance target met - All scans complete in <5 minutes for typical changes

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final improvements

### Documentation

- [ ] T089 [P] Review and update quickstart.md with actual configuration details
- [ ] T090 [P] Validate architecture.md diagrams match implemented configuration
- [ ] T091 [P] Add troubleshooting section to .gitlab-ci.yml with common issues
- [ ] T092 [P] Document GitLab tier requirements clearly (Free: Secret Detection + SAST, Ultimate: Dependency Scanning)

### Validation

- [ ] T093 Validate .gitlab-ci.yml syntax using gitlab-ci-lint command
- [ ] T094 Verify all job dependencies are correct (security stage runs after test stage if present)
- [ ] T095 Verify artifact retention settings (30 days default)
- [ ] T096 Run complete pipeline end-to-end with all test commits

### Final Improvements

- [ ] T097 Add job retry logic for transient scanner errors (retry: 2)
- [ ] T098 Configure artifact expiration appropriately (expire_in: 30 days)
- [ ] T099 Verify pipeline passes with clean code (no test commits)
- [ ] T100 Run quickstart.md validation (follow steps 1-7, verify all work)

**Checkpoint**: Feature complete and documented - Ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (Secret Detection): Can start after Phase 2 - Highest priority (P1) 🎯 MVP
  - User Story 2 (Dependency Scanning): Can start after Phase 2 - Medium priority (P2)
  - User Story 3 (SAST): Can start after Phase 2 - Lowest priority (P3)
  - **Stories can proceed in parallel if staffed, or sequentially in priority order**
- **Dashboard Integration (Phase 6)**: Depends on at least one user story (US1) completing
- **Edge Cases (Phase 7)**: Depends on all user stories completing
- **Performance (Phase 8)**: Depends on all user stories completing
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - **Start here for MVP**
- **User Story 2 (P2)**: No dependencies on US1 - Can run in parallel with US1
- **User Story 3 (P3)**: No dependencies on US1/US2 - Can run in parallel with US1/US2

**Key Insight**: All three user stories are independent and can be implemented in parallel by different team members once Foundational phase is complete.

### Within Each User Story (TDD Cycle)

1. **RED**: Create test commits with security issues - MUST FAIL before implementation
2. **GREEN**: Add scanner configuration to .gitlab-ci.yml - Tests MUST PASS
3. **REFACTOR**: Optimize performance, handle false positives - Tests MUST STILL PASS

### Parallel Opportunities

**Phase 1 (Setup)**: All tasks marked [P] can run in parallel:
- T002 (test-commits subdirs), T003 (expected-results), T004 (.gitlab dir)

**Phase 2 (Foundational)**: Tasks T007-T008 marked [P] can run in parallel

**Phase 3 (US1 RED)**: All test commit creation tasks T009-T012 marked [P] can run in parallel

**Phase 4 (US2 RED)**: All test commit creation tasks T026-T028 marked [P] can run in parallel

**Phase 5 (US3 RED)**: All test commit creation tasks T040-T043 marked [P] can run in parallel

**Phase 6 (Dashboard)**: Policy configuration tasks T057-T059 and validation tasks T061-T063 can run in parallel

**Cross-Story Parallelism**: Once Phase 2 completes, all three user stories (Phase 3, 4, 5) can be worked on simultaneously by different developers.

---

## Parallel Example: User Story 1 (Secret Detection)

```bash
# RED Phase - Create all test commits in parallel:
Task: "Create test commit with fake AWS API key in tests/security/test-commits/secrets/aws-api-key.js"
Task: "Create test commit with fake GitHub token in tests/security/test-commits/secrets/github-token.py"
Task: "Create test commit with fake password in tests/security/test-commits/secrets/password-leak.js"
Task: "Create false positive test (doc example) in tests/security/test-commits/secrets/false-positive.md"

# GREEN Phase - Sequential implementation (must configure scanner in order):
Task: "Add Security/Secret-Detection.gitlab-ci.yml template include to .gitlab-ci.yml"
Task: "Configure secret_detection job in .gitlab-ci.yml"
# ... (remaining GREEN tasks in order)

# REFACTOR Phase - Can parallelize some tasks:
Task: "Add path exclusions to .gitlab-ci.yml"
Task: "Create .gitleaksignore file at repository root"
```

---

## Parallel Example: All User Stories (After Foundational Phase)

```bash
# Developer A works on User Story 1 (Secret Detection):
Phase 3: T009 → T010 → T011 → T012 → T013 → T014 → ... → T025

# Developer B works on User Story 2 (Dependency Scanning) simultaneously:
Phase 4: T026 → T027 → T028 → T029 → T030 → ... → T039

# Developer C works on User Story 3 (SAST) simultaneously:
Phase 5: T040 → T041 → T042 → T043 → T044 → ... → T055

# All three developers work in parallel after Phase 2 completes
# No conflicts because each story modifies different parts of .gitlab-ci.yml and test files
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) 🎯

**Recommended for fastest time-to-value**

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T008) - CRITICAL
3. Complete Phase 3: User Story 1 - Secret Detection (T009-T025)
4. **STOP and VALIDATE**: Test secret detection independently
   - Commit code with AWS key → Pipeline blocks ✅
   - Commit clean code → Pipeline passes ✅
   - Commit doc example → Pipeline passes (false positive exempted) ✅
5. Deploy MVP to production
6. **Result**: Critical risk (secret leaks) addressed immediately

### Incremental Delivery

**Recommended for progressive value delivery**

1. **Week 1**: Complete Setup + Foundational + US1 (Secret Detection)
   - Deploy: Secrets now blocked 🔒
   - Team Training: How to handle secret detection findings
   - Blocking: Enabled immediately (highest risk)

2. **Week 2**: Add US2 (Dependency Scanning)
   - Deploy: CVEs now detected 📦
   - Team Training: CVE remediation and risk acceptance
   - Blocking: Warning-only for 1 week, then block high/critical

3. **Week 3**: Add US3 (SAST)
   - Deploy: Code security issues now detected 🛡️
   - Team Training: SAST findings interpretation
   - Blocking: Warning-only indefinitely (human review required)

4. **Week 4**: Complete Dashboard Integration + Edge Cases + Performance + Polish
   - Deploy: Full feature with Security Dashboard integration
   - Monitor: Security Dashboard for trends
   - Iterate: Adjust allowlists based on feedback

5. **Each week adds value without breaking previous weeks' features**

### Parallel Team Strategy (3 Developers)

**Recommended for fastest total delivery**

1. **Together**: Complete Phase 1 (Setup) + Phase 2 (Foundational) - 1 day
2. **Split work once Foundational is done**:
   - **Developer A**: Phase 3 - User Story 1 (Secret Detection) - 2 days
   - **Developer B**: Phase 4 - User Story 2 (Dependency Scanning) - 2 days
   - **Developer C**: Phase 5 - User Story 3 (SAST) - 2 days
3. **Together**: Phase 6 (Dashboard Integration) - 1 day
4. **Together**: Phase 7-9 (Edge Cases, Performance, Polish) - 1 day
5. **Result**: Complete feature in 5 days vs 7 days sequential

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3)
- Each user story follows TDD cycle: RED (failing tests) → GREEN (make pass) → REFACTOR (optimize)
- All user stories are independently testable and deployable
- Verify test commits FAIL before implementing scanner configuration
- Verify test commits PASS after implementing scanner configuration
- Verify false positives handled after refactoring
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: same file conflicts (use comments to separate scanner configs in .gitlab-ci.yml)

---

## Total Task Count: 100 Tasks

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (US1 - Secret Detection)**: 17 tasks (9 RED, 7 GREEN, 5 REFACTOR)
- **Phase 4 (US2 - Dependency Scanning)**: 14 tasks (4 RED, 6 GREEN, 4 REFACTOR)
- **Phase 5 (US3 - SAST)**: 16 tasks (5 RED, 7 GREEN, 4 REFACTOR)
- **Phase 6 (Dashboard Integration)**: 16 tasks
- **Phase 7 (Edge Cases)**: 8 tasks
- **Phase 8 (Performance)**: 9 tasks
- **Phase 9 (Polish)**: 12 tasks

**Parallel Opportunities**: 35+ tasks marked [P] can run in parallel within their phase

**Independent Stories**: All 3 user stories can run in parallel after Foundational phase

**MVP Scope**: Phases 1-3 only (25 tasks) delivers secret detection - highest value, fastest

**Full Feature**: All 100 tasks delivers complete security scanning pipeline with dashboard integration
