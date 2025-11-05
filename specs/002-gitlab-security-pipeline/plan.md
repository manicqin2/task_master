# Implementation Plan: GitLab Security Scanning Pipeline

**Branch**: `002-gitlab-security-pipeline` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-gitlab-security-pipeline/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement automated security scanning pipeline for GitLab CI/CD that detects secrets, dependency vulnerabilities, and code security issues before merge. Uses GitLab's native security features (Secret Detection, Dependency Scanning, SAST) with configurable blocking policies and integrated security dashboard reporting.

## Technical Context

**Language/Version**: GitLab CI/CD YAML (v1), Python 3.11+ (for backend), Node.js 18+ (for frontend)
**Primary Dependencies**: GitLab CI Templates (Secret-Detection, Dependency-Scanning, SAST), Gitleaks (secret detection), Gemnasium (dependency scanning), Semgrep (SAST)
**Storage**: GitLab Security Dashboard (native), Artifact storage for security reports (JSON)
**Testing**: Test commits with known security issues (TDD approach), GitLab CI pipeline validation
**Target Platform**: GitLab CI/CD runners (Linux), compatible with shared and self-hosted runners
**Project Type**: Infrastructure/CI configuration (affects existing multi-project repo)
**Performance Goals**: Complete all security scans within 5 minutes for typical changes
**Constraints**: Must work with GitLab Free tier where possible, Premium/Ultimate features clearly documented
**Scale/Scope**: Scans full codebase on initial setup, differential scans on MRs (commit range limiting)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Library-First Architecture
**Status**: ✅ N/A - Infrastructure Configuration
**Justification**: This feature configures GitLab CI/CD pipeline via YAML. It does not implement libraries or code modules, so the library-first principle does not apply. The feature integrates existing security scanning tools (Gitleaks, Gemnasium, Semgrep) provided by GitLab.

### II. Test-Driven Development (NON-NEGOTIABLE)
**Status**: ✅ COMPLIANT
**Approach**: TDD applied via "test commits" containing known security issues:
1. **RED**: Create test commits with intentional security issues (secrets, vulnerable dependencies, insecure code patterns)
2. **GREEN**: Implement pipeline configuration that detects these issues
3. **REFACTOR**: Optimize scan performance, adjust policies, reduce false positives

Test commits will include:
- Fake API keys for secret detection
- Packages with known CVEs for dependency scanning
- SQL injection patterns for SAST
- False positive cases (documentation examples)

### III. Clean Modular Architecture
**Status**: ✅ COMPLIANT
**Approach**: Pipeline jobs are separated by concern:
- **Secret Detection Job**: Independent, scans file content only
- **Dependency Scanning Job**: Independent, scans package manifests only
- **SAST Job**: Independent, scans source code only
- **Security Report Job**: Depends on scan jobs, aggregates results

Each job has explicit inputs (commit range, file paths) and outputs (JSON artifacts). Jobs run in parallel for performance, have no circular dependencies, and follow GitLab's standard security report schema as the contract interface.

### Visual Documentation Standards
**Status**: 🔄 PENDING - Phase 1 Required Diagrams:
- System architecture overview (pipeline stages and tools)
- Container/deployment diagram (CI runner environment)
- Startup sequence diagram (job execution order)
- Configuration flow diagram (policy evaluation logic)

## Project Structure

### Documentation (this feature)

```text
specs/002-gitlab-security-pipeline/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output ✅ COMPLETE
├── data-model.md        # Phase 1 output - TODO
├── quickstart.md        # Phase 1 output - TODO
├── architecture.md      # Phase 1 output - TODO (required by constitution)
├── contracts/           # Phase 1 output - TODO
│   ├── gitlab-ci-schema.yml       # Pipeline configuration contract
│   ├── security-report-schema.json # GitLab security report format
│   └── approval-policy-schema.yml  # Merge request policy contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Infrastructure configuration (new files)
.gitlab-ci.yml                  # Main pipeline configuration
.gitlab/security-policies.yml   # Security policy configuration

# Testing artifacts (for TDD approach)
tests/security/
├── test-commits/
│   ├── secrets/
│   │   ├── aws-api-key.js        # Test: AWS key detection
│   │   ├── github-token.py       # Test: GitHub token detection
│   │   └── false-positive.md     # Test: Documentation example
│   ├── dependencies/
│   │   ├── vulnerable-package.json    # Test: Known CVE in npm package
│   │   └── vulnerable-requirements.txt # Test: Known CVE in Python package
│   └── sast/
│       ├── sql-injection.js      # Test: SQL injection pattern
│       ├── xss-vulnerability.jsx # Test: XSS vulnerability
│       └── insecure-crypto.py    # Test: Weak cryptography
└── expected-results/
    ├── secret-detection.json     # Expected findings for secret tests
    ├── dependency-scanning.json  # Expected findings for dependency tests
    └── sast.json                 # Expected findings for SAST tests

# Existing structure (no changes)
backend/                         # Feature 001 code (unchanged)
frontend/                        # Feature 001 code (unchanged)
docker/                          # Feature 001 infrastructure (unchanged)
```

**Structure Decision**: This is an infrastructure feature that adds GitLab CI/CD configuration to the existing multi-project repository. The main deliverable is `.gitlab-ci.yml` at the repository root. Test artifacts are organized under `tests/security/` to support TDD validation. The feature does not modify existing `backend/`, `frontend/`, or `docker/` directories from Feature 001.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations requiring justification.*

## Phase 0: Research ✅ COMPLETE

**Objective**: Resolve all "NEEDS CLARIFICATION" items from Technical Context

**Output**: [research.md](./research.md)

**Key Findings**:
- GitLab Secret Detection uses Gitleaks internally, template: `Jobs/Secret-Detection.gitlab-ci.yml`
- Dependency Scanning uses Gemnasium analyzers for npm and Python
- SAST uses Semgrep for JavaScript/TypeScript/Python detection
- Performance target achievable: 1-5 minutes depending on project size
- Merge Request Approval Policies configure blocking vs warning behavior
- GitLab Free tier supports Secret Detection and SAST, Dependency Scanning requires Ultimate
- JSON report schema: GitLab-standardized security report format
- Performance optimization: parallel jobs, path exclusions, commit range limiting

## Phase 1: Design

**Objective**: Create data model, API contracts, quickstart guide, and architecture diagrams

### 1.1 Data Model (data-model.md)

Define entities identified in spec:
- **Security Finding**: type, severity, file_location, description, remediation_advice
- **Scan Result**: timestamp, commit_sha, scan_types, pass_fail_status, artifact_references
- **Security Policy**: secret_patterns, vulnerability_thresholds, sast_rules, blocking_config

Document JSON schema for GitLab security reports and relationships between entities.

### 1.2 Contracts (contracts/)

Generate contract definitions:
- **gitlab-ci-schema.yml**: Pipeline job structure, stage definitions, artifact paths
- **security-report-schema.json**: GitLab's standardized security report format
- **approval-policy-schema.yml**: Merge request blocking rule configuration

These contracts define interfaces between GitLab CI system and security scanning tools.

### 1.3 Quickstart Guide (quickstart.md)

Step-by-step setup:
1. Prerequisites (GitLab tier, runner availability)
2. Add `.gitlab-ci.yml` to repository root
3. Configure protected branches
4. Set up merge request approval policies
5. Run first pipeline and interpret results
6. Handle false positives (allowlists)

### 1.4 Architecture Diagrams (architecture.md)

Required diagrams per constitution (System/Infrastructure features):
- **System Architecture Overview**: GitLab CI pipeline stages, security tools (Gitleaks, Gemnasium, Semgrep), Security Dashboard integration
- **Container/Deployment Diagram**: CI runner environment, Docker images for scanners, artifact storage
- **Startup Sequence Diagram**: Job execution order (parallel scans → report aggregation → policy evaluation)
- **Configuration Flow Diagram**: How policies determine merge blocking vs warnings

## Phase 2: Implementation Breakdown

**Objective**: Implement feature following TDD approach and user story priorities

### Phase 2.1: P1 - Automated Secret Detection (User Story 1)

**TDD Cycle**:
1. **RED**: Create test commits with fake secrets (AWS keys, GitHub tokens, passwords)
2. **GREEN**: Add Secret Detection job to `.gitlab-ci.yml`, verify detection
3. **REFACTOR**: Configure allowlists for false positives (e.g., documentation examples)

**Files**:
- `.gitlab-ci.yml`: Add `secret_detection` job
- `tests/security/test-commits/secrets/`: Test cases
- `tests/security/expected-results/secret-detection.json`: Expected findings

**Acceptance Criteria**:
- ✅ AS-1.1: AWS API key detected with file:line report
- ✅ AS-1.2: Clean code passes secret scanning stage
- ✅ AS-1.3: Clear remediation instructions in report

### Phase 2.2: P2 - Dependency Vulnerability Scanning (User Story 2)

**TDD Cycle**:
1. **RED**: Add packages with known CVEs to package.json/pyproject.toml
2. **GREEN**: Add Dependency Scanning job to `.gitlab-ci.yml`, verify CVE detection
3. **REFACTOR**: Configure severity thresholds, exemptions for accepted risks

**Files**:
- `.gitlab-ci.yml`: Add `dependency_scanning` job
- `tests/security/test-commits/dependencies/`: Test cases
- `tests/security/expected-results/dependency-scanning.json`: Expected findings

**Acceptance Criteria**:
- ✅ AS-2.1: High-severity CVE reported with version info
- ✅ AS-2.2: Up-to-date dependencies pass scanning
- ✅ AS-2.3: Remediation advice includes version upgrade path

### Phase 2.3: P3 - Code Security Analysis (SAST) (User Story 3)

**TDD Cycle**:
1. **RED**: Create code with security anti-patterns (SQL injection, XSS, weak crypto)
2. **GREEN**: Add SAST job to `.gitlab-ci.yml`, verify detection
3. **REFACTOR**: Tune rules to reduce false positives, add exemptions

**Files**:
- `.gitlab-ci.yml`: Add `sast` job
- `tests/security/test-commits/sast/`: Test cases
- `tests/security/expected-results/sast.json`: Expected findings

**Acceptance Criteria**:
- ✅ AS-3.1: SQL injection pattern identified with line numbers
- ✅ AS-3.2: Insecure crypto flagged with secure alternatives
- ✅ AS-3.3: Passed SAST shows summary of files analyzed

### Phase 2.4: Security Dashboard Integration

**Objective**: Integrate scan results with GitLab Security Dashboard (FR-010)

**Tasks**:
- Verify JSON artifacts follow GitLab security report schema
- Configure Security Dashboard to display vulnerability trends
- Set up merge request approval policies (FR-008)

**Files**:
- `.gitlab/security-policies.yml`: Policy configuration
- Pipeline artifact uploads for dashboard ingestion

### Phase 2.5: Edge Case Handling

Address edge cases from specification:
- Gitignored files accidentally staged
- Large binary files (scan exclusions)
- Vulnerabilities with no patch available (risk acceptance workflow)
- False positives (allowlist configuration)
- Scanner service unavailable (job retry logic)
- Secrets in commit history (documentation guidance, no automated fix)

## Testing Strategy

### Contract Tests
Test GitLab CI configuration validity:
- YAML syntax validation (`gitlab-ci-lint` command)
- Job dependency graph correctness
- Artifact schema compliance (JSON validation)

### Integration Tests
Test pipeline execution end-to-end:
- Run pipeline against test commits
- Verify expected security findings match actual results
- Validate Security Dashboard ingestion
- Test merge request blocking behavior

### Unit Tests
Not applicable - this is infrastructure configuration, not application code.

### TDD Validation
- All test commits must trigger expected pipeline failures (RED)
- All security issues must be detected with correct severity (GREEN)
- Performance must meet 5-minute target (REFACTOR)

## Rollout Plan

### Week 1: Secret Detection (P1)
- Implement and test secret detection job
- Deploy to development branch
- Team training on interpreting results
- **Blocking**: Enabled immediately (highest risk)

### Week 2: Dependency Scanning (P2)
- Implement and test dependency scanning job
- Deploy to development branch
- Team training on CVE remediation
- **Blocking**: Warning-only for 1 week, then blocking for high/critical

### Week 3: SAST (P3)
- Implement and test SAST job
- Deploy to development branch
- Tune rules based on initial false positive rate
- **Blocking**: Warning-only indefinitely (human review required)

### Week 4: Production Enforcement
- Enable all scans on protected branches (main)
- Configure merge request approval policies
- Monitor Security Dashboard for trends
- Iterate on allowlists based on team feedback

## Success Metrics

Mapping to specification success criteria:

- **SC-001**: Zero secrets in main branch → Track secret detection findings, verify none merged
- **SC-002**: Feedback within 5 minutes → Monitor pipeline duration metrics
- **SC-003**: Results available before merge → Verify all MR pipelines complete before approval
- **SC-004**: High-severity remediation within 7 days → Track time-to-resolution in Security Dashboard
- **SC-005**: False positive rate <5% → Measure (false positives / total findings) over 100 scans
- **SC-006**: Security debt trends visible → Verify Security Dashboard shows historical vulnerability data

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pipeline timeout (>5 min) | Developer frustration | Parallel jobs, commit range limiting, path exclusions |
| High false positive rate | Ignored warnings | Tune rules during REFACTOR phase, allowlists |
| GitLab tier limitations | Missing features | Document Free vs Premium/Ultimate, graceful degradation |
| Developer resistance | Low adoption | Training, clear remediation guidance, progressive enforcement |
| Scanner unavailable | Pipeline failure | Retry logic, allow_failure for non-critical jobs |

## Dependencies

**External**:
- GitLab CI/CD enabled
- GitLab Ultimate license (for full features)
- CI runners with internet access (for CVE database updates)

**Internal**:
- Protected branch rules configured
- Team capacity for security triage

## Follow-Up Features

Out of scope for this feature, potential future work:
- Historical commit scanning (retroactive analysis)
- Automated secret rotation
- Dynamic application security testing (DAST)
- Third-party security service integrations (Snyk, Checkmarx)
- Custom security rules and plugins
