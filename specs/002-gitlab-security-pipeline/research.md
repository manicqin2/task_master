# GitLab CI/CD Security Scanning Research

**Research Date:** 2025-11-05
**Focus:** GitLab Native Security Features (not third-party integrations)

---

## Executive Summary

GitLab provides comprehensive native security scanning tools integrated directly into CI/CD pipelines through include templates. The main security features are:

- **Secret Detection** (using Gitleaks under the hood)
- **Dependency Scanning** (using Gemnasium analyzers)
- **SAST** (Static Application Security Testing, using Semgrep for JS/TS/Python)
- **Security Dashboard & Vulnerability Reports** (project, group, and security center levels)
- **Merge Request Approval Policies** (formerly Scan Result Policies)

All security jobs run in the `test` stage by default and generate JSON artifacts that populate GitLab's security features.

---

## 1. Secret Detection

### Overview
GitLab's native Secret Detection feature uses Gitleaks under the hood to scan for hardcoded secrets, credentials, and sensitive information in your codebase.

### GitLab CI Template

**Template Path (Latest):**
```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
```

**Alternative Template Path (Older versions):**
```yaml
include:
  - template: Security/Secret-Detection.gitlab-ci.yml
```

### Basic Configuration Example

```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml

# Default configuration - job runs automatically
```

### Key CI/CD Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SECRET_DETECTION_HISTORIC_SCAN` | Scan entire Git history | `false` | `"true"` |
| `SECRET_DETECTION_LOG_OPTIONS` | Customize commit range to scan | - | `"HEAD~10..HEAD"` |
| `SECRET_DETECTION_IMAGE_SUFFIX` | Use FIPS-enabled images | - | `"-fips"` |
| `SECRET_DETECTION_RULESET_GIT_REFERENCE` | Use remote ruleset configuration | - | Custom git reference |
| `GIT_DEPTH` | Control Git clone depth | - | `50` |

### Configuration Examples

**Historic Scan (Full Repository History):**
```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml

secret_detection:
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "true"
```

**Custom Commit Range:**
```yaml
secret_detection:
  variables:
    SECRET_DETECTION_LOG_OPTIONS: "HEAD~4..HEAD"
```

**Scan from specific commit to HEAD:**
```yaml
secret_detection:
  variables:
    SECRET_DETECTION_LOG_OPTIONS: "origin..295e57e9"
```

### Custom Rulesets

GitLab allows customization through a TOML configuration file:

**Location:** `.gitlab/secret-detection-ruleset.toml`

**Capabilities:**
- Chain up to 20 passthroughs into a single configuration
- Replace or extend predefined rules
- Include environment variables in passthroughs
- Set timeout for evaluating passthroughs
- Validate TOML syntax

**Ruleset Modification:**
```toml
[passthroughs.gitleaks]
type = "raw"
target = "gitleaks.toml"
value = """
[rules]
  [[rules]]
  id = "custom-rule-1"
  description = "Custom secret pattern"
  regex = '''your-regex-here'''
  tags = ["custom"]
"""
```

### Performance Considerations

**Best Practices:**
- Run historic scans only once after initial setup
- Schedule historic scans during low-usage periods
- Use `SECRET_DETECTION_LOG_OPTIONS` to limit commit range for faster scans
- Disable historic scanning after the initial run

### Artifact Output

**Report Format:** JSON
**Recommended Filename:** `gl-secret-detection-report.json`
**Location:** Must be written to `$CI_PROJECT_DIR`

---

## 2. Dependency Scanning

### Overview
GitLab Dependency Scanning uses Gemnasium-based analyzers to identify vulnerabilities in project dependencies by checking against the GitLab Advisory Database for CVEs and other security issues.

### Important Note
The Gemnasium-based dependency scanning feature is deprecated in GitLab 17.9 and planned for removal in GitLab 19.0. It's being replaced with SBOM-based dependency scanning.

### GitLab CI Template

**Template Path (Current):**
```yaml
include:
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
```

**Template Path (v2):**
```yaml
include:
  - template: Jobs/Dependency-Scanning.v2.gitlab-ci.yml
```

**Template Path (Older versions):**
```yaml
include:
  - template: Dependency-Scanning.gitlab-ci.yml
```

### Basic Configuration

```yaml
include:
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
```

### NPM Configuration

**For projects with generated lockfiles:**

```yaml
include:
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml

# Generate npm lockfile
build:
  script:
    - npm install
  artifacts:
    paths:
      - package-lock.json  # Store lockfile as artifact

# Configure dependency scanning to use the artifact
gemnasium-dependency_scanning:
  needs: ["build"]
```

**Supported npm files:**
- `package-lock.json` (npm)
- `yarn.lock` (Yarn)
- `pnpm-lock.yaml` (pnpm - note: bundled dependencies may differ)

### Python Configuration

**Supported Python files (scanned in order):**
1. `requirements.txt`, `requirements.pip`, or `requires.txt` (pip)
2. `Pipfile` or `Pipfile.lock` (Pipenv)
3. `poetry.lock` (Poetry)

**Important:** Only the first detected file is analyzed. Detection starts in the root directory, then subdirectories.

**Python version configuration:**
```yaml
gemnasium-python-dependency_scanning:
  image:
    name: $CI_TEMPLATE_REGISTRY_HOST/security-products/gemnasium-python:4-python-3.10
```

**Install dependencies before scanning:**
```yaml
gemnasium-python-dependency_scanning:
  before_script:
    - python setup.py install --user
```

Note: The `--user` flag installs dependencies in the user directory, which is required for proper scanning.

### Key CI/CD Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DS_EXCLUDED_PATHS` | Exclude paths from scanning | `"tests/,docs/,*.test.py"` |
| `PIP_REQUIREMENTS_FILE` | Custom requirements file location | `"requirements/prod.txt"` |

### Configuration Examples

**Exclude paths:**
```yaml
include:
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml

variables:
  DS_EXCLUDED_PATHS: "tests/,docs/,vendor/"
```

**Custom Python requirements file:**
```yaml
variables:
  PIP_REQUIREMENTS_FILE: "requirements/production.txt"
```

### Scanning Behavior

**For Java and Python:**
- Attempts to build the project
- Executes commands to retrieve the dependency list

**For other languages:**
- Parses lock files directly without building

### Artifact Output

**Report Format:** JSON
**Recommended Filename:** `gl-dependency-scanning-report.json`
**Schema:** Available at `gitlab.com/gitlab-org/security-products/security-report-schemas/-/blob/master/dist/dependency-scanning-report-format.json`

### CVE Detection

The Gemnasium analyzer identifies vulnerabilities using:
- CVE identifiers (e.g., CVE-2017-11429)
- Gemnasium internal identifiers
- GitLab Advisory Database

---

## 3. SAST (Static Application Security Testing)

### Overview
GitLab SAST performs static code analysis to identify security vulnerabilities before code reaches production. It does not execute code but analyzes it for common security issues.

### Analyzers for JavaScript/TypeScript and Python

**Primary Analyzer:** Semgrep (as of GitLab 14+)
- Replaced ESLint for JavaScript/TypeScript
- Replaced Bandit for Python (though Bandit is still used alongside Semgrep)
- Powers analysis for JavaScript, TypeScript, Python, and C#

**GitLab Advanced SAST:**
- Introduced in GitLab 17.1 (Python)
- Expanded in GitLab 17.3 (JavaScript, TypeScript, C#)
- Features: Cross-function and cross-file taint analysis
- Detects injection vulnerabilities (SQL injection, XSS) across multiple functions and files

### GitLab CI Template

**Template Path:**
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml
```

**Template Path (Older versions):**
```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
```

### Basic Configuration

```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

# SAST runs automatically when supported languages are detected
```

### Key CI/CD Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SECURE_ANALYZERS_PREFIX` | Custom Docker registry prefix | `$CI_TEMPLATE_REGISTRY_HOST/security-products` | `"localhost:5000/analyzers"` |
| `SAST_EXCLUDED_ANALYZERS` | Disable specific analyzers | - | `"bandit,eslint"` |
| `SAST_EXCLUDED_PATHS` | Exclude paths from scanning | Default paths | `"spec,test,tests,tmp"` |
| `DEFAULT_SAST_EXCLUDED_PATHS` | Default excluded paths | Built-in | - |
| `SAST_IMAGE_SUFFIX` | Custom image suffix | - | `"-fips"` |
| `SAST_ANALYZER_IMAGE` | Override analyzer image | - | Custom image |
| `SEMGREP_GITLAB_JSON` | Enable GitLab dashboard integration | - | `"1"` |

### Configuration Examples

**Exclude specific analyzers:**
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  SAST_EXCLUDED_ANALYZERS: "eslint"  # Only use Semgrep for JS/TS
```

**Exclude paths from scanning:**
```yaml
variables:
  SAST_EXCLUDED_PATHS: "spec,test,tests,tmp,server/libs,assets,vendor,*.min.js"
```

**Exclude with glob patterns:**
```yaml
variables:
  SAST_EXCLUDED_PATHS: "**/*_test.go,test/**/fixture*,vendor/**"
```

**Custom Docker registry:**
```yaml
variables:
  SECURE_ANALYZERS_PREFIX: "registry.example.com/security"
```

### Path Exclusion Behavior

- Uses glob-style patterns with same syntax as `.gitignore`
- Supports double-star patterns: `**/*_test.go`, `test/**/fixture*`
- Applied as pre-filter before scan execution
- Default excluded paths must be included explicitly if you override

**Default Excluded Paths Include:**
- Test directories: `spec/`, `test/`, `tests/`, `tmp/`
- Vendor directories
- Generated/minified files
- Documentation directories

### Semgrep-Specific Features

**Ignore findings inline:**
```python
# nosemgrep
dangerous_function()

# nosemgrep: python.lang.security.sql-injection
execute_query(user_input)
```

**Custom rules:**
- GitLab runs Semgrep with its own managed rule-set
- Rules differ from default Semgrep rules
- Can be customized through Semgrep configuration

### Artifact Output

**Report Format:** JSON
**Recommended Filename:** `gl-sast-report.json`
**Schema:** Available at `gitlab.com/gitlab-org/security-products/security-report-schemas/-/blob/master/dist/sast-report-format.json`

### Performance Improvements

Recent updates (GitLab Advanced SAST):
- 71% reduction in scan time for large codebases
- Many large repositories now complete in under 10 minutes (previously 20+ minutes)
- Cross-function taint analysis without significant performance penalty

---

## 4. GitLab Security Dashboard and Integration

### Overview
Security scanning results automatically integrate with GitLab's security features at multiple levels, providing comprehensive visibility into security posture.

### Integration Points

1. **Pipeline View** - Security job results in pipeline execution view
2. **Merge Request Widget** - Summary of newly detected vulnerabilities
3. **Vulnerability Report** - Detailed list of all findings (project and group level)
4. **Security Dashboard** - Metrics, ratings, and charts (project, group, and Security Center)

### Security Dashboard Levels

#### Project-Level Security Dashboard
- Shows vulnerabilities in the default branch of a single project
- Displays cumulative results from all successful security scan jobs
- Provides filtering and export capabilities

#### Group-Level Security Dashboard
- Aggregates vulnerabilities across all projects in a group and subgroups
- Shows vulnerabilities from default branches
- Provides vulnerability trends over 30, 60, or 90 days
- Assigns letter grade to each project based on highest-severity open vulnerability

#### Security Center
- Organization-wide security overview
- Cross-project security metrics

### Vulnerability Report

**Access Path:**
```
Project/Group → Secure → Vulnerability report
```

**Features:**
- Totals of vulnerabilities per severity level
- Filters for common vulnerability attributes
- Details of each vulnerability in table format
- Export to PDF for audit purposes
- Shows data from default branch only

### Merge Request Integration

**Merge Request Widget displays:**
- Summary of newly detected vulnerabilities
- Comparison with target branch
- Direct links to vulnerability details
- Security scan completion status

**Configuration for MR Pipelines:**
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/Secret-Detection.gitlab-ci.yml

variables:
  AST_ENABLE_MR_PIPELINES: "true"  # Enable for merge request pipelines
```

### Report Schema Validation

**Important:** Reports must validate against declared schema version or they will be rejected.

**Schema locations:**
- SAST: `security-report-schemas/-/blob/master/dist/sast-report-format.json`
- Dependency Scanning: `security-report-schemas/-/blob/master/dist/dependency-scanning-report-format.json`
- Secret Detection: Similar schema structure

**File naming convention:**
- Use `gl-` prefix
- Include scan type in name
- Use `.json` extension
- Examples: `gl-sast-report.json`, `gl-dependency-scanning-report.json`, `gl-secret-detection-report.json`

### Findings Expiration

**Expiration triggers:**
- When related CI/CD job artifact expires
- 90 days after pipeline creation (even if artifacts are locked)

---

## 5. Pipeline Configuration Best Practices

### Complete Example: All Security Scans with MR Pipelines

```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/SAST.gitlab-ci.yml

# Enable security scans in merge request pipelines
variables:
  AST_ENABLE_MR_PIPELINES: "true"

  # Performance optimizations
  SAST_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules"
  DS_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor"

  # Custom Docker registry (if needed)
  # SECURE_ANALYZERS_PREFIX: "registry.example.com/security"

# Define stages if not already present
stages:
  - test
  - deploy

# Ensure secret detection doesn't scan history every time
secret_detection:
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "false"
```

### Running Security Scans Only on Merge Requests

```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  AST_ENABLE_MR_PIPELINES: "true"

# Override to run only on MRs
sast:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

### Artifact Configuration for Audit

```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

sast:
  artifacts:
    paths:
      - gl-sast-report.json
    reports:
      sast: gl-sast-report.json
    expire_in: 30 days  # Keep for audit purposes
    access: developer   # Control who can download
```

### Performance Optimization Configuration

**5-Minute Timeout Target:**

```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  AST_ENABLE_MR_PIPELINES: "true"

  # Limit scan scope
  SAST_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules,*.min.js,dist,build"
  DS_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules,dist,build"

  # Only scan recent commits for secrets (not full history)
  SECRET_DETECTION_LOG_OPTIONS: "HEAD~5..HEAD"

# Run security jobs in parallel
secret_detection:
  stage: test

dependency_scanning:
  stage: test

sast:
  stage: test

# Use compilation job to speed up dependency scanning
compile:
  stage: .pre
  script:
    - npm ci  # or pip install -r requirements.txt
  artifacts:
    paths:
      - node_modules/  # or venv/
      - package-lock.json  # or requirements.txt
    expire_in: 1 hour

gemnasium-dependency_scanning:
  needs: ["compile"]
```

### Container Scanning Timeout Configuration

```yaml
container_scanning:
  variables:
    TRIVY_TIMEOUT: "5m"  # Set 5-minute timeout
```

### Performance Optimization Strategies

1. **Run jobs in parallel** - All security jobs in same stage
2. **Use caching** - Cache dependencies and build artifacts
3. **Limit scan scope** - Use exclusion paths for test/vendor code
4. **Pre-compilation** - Build dependencies once, reuse for scanning
5. **Incremental scanning** - For secrets, scan only recent commits
6. **Runner sizing** - Use larger runners with more vCPUs for faster scans
7. **Exclude generated files** - Skip minified JS, compiled assets

**Infrastructure improvements:**
- Increase runner vCPU count (large impact on performance)
- Use SSD storage for runners
- Ensure adequate network bandwidth for pulling images

**Expected performance with optimizations:**
- Small to medium projects: 2-5 minutes
- Large projects: 5-10 minutes
- Very large projects: Up to 15 minutes

---

## 6. Merge Request Approval Policies (Blocking Configuration)

### Overview
Merge Request Approval Policies (formerly Scan Result Policies) evaluate security scan results and can block merge requests based on findings.

**Key Point:** Renamed from "Scan Result Policies" to "Merge Request Approval Policies" in GitLab 16.9

### How Policies Work

**Evaluation:**
- Policies are evaluated after CI scanning jobs complete
- Based on artifact reports published in completed pipeline
- Requires all configured scanners to be present in MR pipeline

**Blocking Behavior:**
- MRs are blocked until pipeline and security scans complete
- When findings match policy criteria, MR requires approval
- Only applies to protected target branches

### Vulnerability States

Policies can target different vulnerability states:
- **Newly Detected** - Exists on MR branch but not on default branch
- **Previously Existing** - Already present in default branch
- **All States** - Any vulnerability regardless of state

### Configuration Example: Warning vs Blocking

**Warning Mode (Non-Blocking):**
```yaml
# In .gitlab-ci.yml - just run the scans
include:
  - template: Jobs/SAST.gitlab-ci.yml

# No policies configured - results shown as warnings in MR widget
```

**Blocking Mode (Requires Merge Request Approval Policy):**

Merge Request Approval Policies are configured through GitLab UI, not `.gitlab-ci.yml`:

**Navigation:** `Security & Compliance → Policies → New policy → Merge request approval policy`

**Policy Configuration:**
1. Select scan types to enforce (SAST, Dependency Scanning, Secret Detection, etc.)
2. Define severity thresholds (Critical, High, Medium, Low)
3. Specify vulnerability states (newly_detected, detected, confirmed)
4. Set number of required approvals
5. Define who can approve

**Example policy (conceptual):**
- Scan types: SAST, Dependency Scanning, Secret Detection
- Block if: Any Critical or High severity vulnerability is newly detected
- Requires: 2 approvals from security team
- Applies to: Protected branches (main, production)

### Configurable Blocking Policies

**Severity-based:**
- Block on Critical vulnerabilities
- Block on High or above
- Block on Medium or above
- Warning only for Low

**State-based:**
- Block only on newly detected vulnerabilities
- Block on all vulnerabilities (including existing)
- Block on confirmed vulnerabilities only

**Scanner requirements:**
- Require all configured scanners to complete
- Allow partial scanner results

### Best Practices for Policies

1. **Start with warnings** - Don't enable blocking immediately
2. **Use newly_detected** - Focus on new issues introduced in MR
3. **Set appropriate thresholds** - Balance security with velocity
4. **Clear ownership** - Define who can approve security findings
5. **Progressive enforcement** - Start with Critical/High, expand gradually

### Example: Progressive Policy Approach

**Phase 1 - Monitoring (Weeks 1-2):**
- Run all scans
- No blocking
- Monitor findings in dashboards

**Phase 2 - Soft Enforcement (Weeks 3-4):**
- Block on Critical newly_detected vulnerabilities only
- 1 approval required from security team

**Phase 3 - Standard Enforcement (Week 5+):**
- Block on Critical and High newly_detected vulnerabilities
- 1 approval required from security team
- All scanners must complete

**Phase 4 - Strict Enforcement (Optional):**
- Block on Medium and above
- 2 approvals required
- Zero tolerance for secrets

---

## 7. Report Format Specifications

### Common Report Structure

All security reports follow a similar JSON structure with these key fields:

```json
{
  "version": "15.0.0",
  "vulnerabilities": [
    {
      "id": "unique-id",
      "category": "sast",
      "name": "SQL Injection",
      "message": "Description of the vulnerability",
      "description": "Detailed explanation",
      "severity": "High",
      "confidence": "Medium",
      "location": {
        "file": "path/to/file.js",
        "start_line": 42,
        "end_line": 45
      },
      "identifiers": [
        {
          "type": "cve",
          "name": "CVE-2021-12345",
          "value": "CVE-2021-12345",
          "url": "https://cve.mitre.org/..."
        }
      ]
    }
  ],
  "remediations": [],
  "scan": {
    "analyzer": {
      "id": "semgrep",
      "name": "Semgrep",
      "version": "1.0.0",
      "vendor": {
        "name": "GitLab"
      }
    },
    "scanner": {
      "id": "semgrep",
      "name": "Semgrep",
      "version": "1.0.0"
    },
    "type": "sast",
    "start_time": "2025-11-05T10:00:00",
    "end_time": "2025-11-05T10:05:00",
    "status": "success"
  }
}
```

### Severity Levels

All scanners use consistent severity levels:
- **Critical** - Immediate action required
- **High** - High priority fix
- **Medium** - Should be fixed soon
- **Low** - Nice to fix
- **Info** - Informational only
- **Unknown** - Severity not determined

### Report File Naming

**Required naming convention:**
- Prefix with `gl-`
- Include scan type
- Use `.json` extension

**Standard filenames:**
- `gl-sast-report.json`
- `gl-dependency-scanning-report.json`
- `gl-secret-detection-report.json`
- `gl-container-scanning-report.json`
- `gl-dast-report.json`

### Artifact Configuration

```yaml
security_scan:
  artifacts:
    reports:
      sast: gl-sast-report.json
      dependency_scanning: gl-dependency-scanning-report.json
      secret_detection: gl-secret-detection-report.json
    paths:
      - gl-sast-report.json
      - gl-dependency-scanning-report.json
      - gl-secret-detection-report.json
    expire_in: 30 days
    access: developer
```

### Schema Validation

**Schema Repository:** `gitlab.com/gitlab-org/security-products/security-report-schemas`

**Available schemas:**
- `dist/sast-report-format.json`
- `dist/dependency-scanning-report-format.json`
- `dist/container-scanning-report-format.json`
- `dist/secret-detection-report-format.json`

**Validation Requirements:**
- Report must conform to declared schema version
- Invalid reports are rejected with error message in pipeline
- GitLab will not ingest reports that fail validation

---

## 8. Complete Reference Configuration

### Full-Featured Security Pipeline

```yaml
# Complete GitLab security scanning configuration
# Includes: Secret Detection, Dependency Scanning, SAST
# Optimized for: Merge requests, 5-minute completion, audit artifacts

include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  # Enable security scans in merge request pipelines
  AST_ENABLE_MR_PIPELINES: "true"

  # Performance: Exclude common non-production paths
  SAST_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules,*.min.js,dist,build,coverage"
  DS_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules,dist,build,coverage"

  # Secret Detection: Only scan recent commits (not full history)
  SECRET_DETECTION_LOG_OPTIONS: "HEAD~5..HEAD"

  # Optional: Custom Docker registry
  # SECURE_ANALYZERS_PREFIX: "registry.example.com/security"

stages:
  - .pre
  - test
  - deploy

# Pre-stage: Compile/build dependencies once
build_dependencies:
  stage: .pre
  script:
    # For Node.js projects
    - npm ci
    # For Python projects
    # - pip install -r requirements.txt --user
  artifacts:
    paths:
      - node_modules/
      - package-lock.json
      # For Python
      # - venv/
    expire_in: 1 hour
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Secret Detection Configuration
secret_detection:
  stage: test
  variables:
    # Disable historic scan after first run
    SECRET_DETECTION_HISTORIC_SCAN: "false"
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json
    paths:
      - gl-secret-detection-report.json
    expire_in: 30 days
    access: developer
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Dependency Scanning Configuration
gemnasium-dependency_scanning:
  stage: test
  needs: ["build_dependencies"]
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json
    paths:
      - gl-dependency-scanning-report.json
    expire_in: 30 days
    access: developer
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# For Python projects, ensure correct Python version
# gemnasium-python-dependency_scanning:
#   image:
#     name: $CI_TEMPLATE_REGISTRY_HOST/security-products/gemnasium-python:4-python-3.10
#   needs: ["build_dependencies"]

# SAST Configuration
sast:
  stage: test
  artifacts:
    reports:
      sast: gl-sast-report.json
    paths:
      - gl-sast-report.json
    expire_in: 30 days
    access: developer
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Optionally disable specific SAST analyzers
# variables:
#   SAST_EXCLUDED_ANALYZERS: "bandit"
```

---

## 9. Key Variables Reference

### Global Security Variables

| Variable | Scope | Description | Default |
|----------|-------|-------------|---------|
| `AST_ENABLE_MR_PIPELINES` | All security scanners | Enable security jobs in MR pipelines | `false` |
| `SECURE_ANALYZERS_PREFIX` | All (except container scanning) | Custom Docker registry prefix | `$CI_TEMPLATE_REGISTRY_HOST/security-products` |

### Secret Detection Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SECRET_DETECTION_HISTORIC_SCAN` | Scan full Git history | `false` | `"true"` |
| `SECRET_DETECTION_LOG_OPTIONS` | Custom commit range | - | `"HEAD~10..HEAD"` |
| `SECRET_DETECTION_IMAGE_SUFFIX` | Image variant suffix | - | `"-fips"` |
| `SECRET_DETECTION_RULESET_GIT_REFERENCE` | Remote ruleset reference | - | Custom ref |
| `GIT_DEPTH` | Git clone depth | - | `50` |

### Dependency Scanning Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DS_EXCLUDED_PATHS` | Exclude paths | `"tests/,docs/"` |
| `PIP_REQUIREMENTS_FILE` | Custom requirements file | `"requirements/prod.txt"` |
| `DS_PYTHON_VERSION` | Python version | `"3.10"` |

### SAST Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SAST_EXCLUDED_PATHS` | Exclude paths | Default paths | `"spec,test,vendor"` |
| `SAST_EXCLUDED_ANALYZERS` | Disable analyzers | - | `"bandit,eslint"` |
| `SAST_IMAGE_SUFFIX` | Image variant | - | `"-fips"` |
| `SAST_ANALYZER_IMAGE` | Override analyzer image | - | Custom image |
| `SEMGREP_GITLAB_JSON` | GitLab integration | - | `"1"` |

---

## 10. Performance Optimization Summary

### Target: 5-Minute Completion

**Key Strategies:**

1. **Parallel Execution**
   - Run all security jobs in same `test` stage
   - Jobs execute concurrently on available runners

2. **Scope Limitation**
   - Exclude test directories, vendor code, generated files
   - Use `SAST_EXCLUDED_PATHS` and `DS_EXCLUDED_PATHS`
   - For secrets: `SECRET_DETECTION_LOG_OPTIONS: "HEAD~5..HEAD"`

3. **Pre-compilation**
   - Build dependencies once in `.pre` stage
   - Store as artifacts, reuse in scan jobs
   - Saves 1-3 minutes per scan

4. **Infrastructure**
   - Use larger runners (more vCPUs = faster scans)
   - SSD storage for faster I/O
   - Good network bandwidth for image pulls

5. **Smart Caching**
   - Cache node_modules, pip packages, Docker layers
   - Use GitLab CI cache effectively

6. **Incremental Scanning**
   - Secret detection: Scan only recent commits
   - Avoid historic scans in regular MR pipelines

### Expected Results

**With optimizations:**
- Small projects (< 10K LOC): 1-3 minutes
- Medium projects (10K-50K LOC): 3-5 minutes
- Large projects (50K-100K LOC): 5-10 minutes
- Very large projects (> 100K LOC): 10-15 minutes

**Recent improvements (GitLab Advanced SAST):**
- Up to 71% faster scan times
- Large repositories: 20+ minutes → under 10 minutes

---

## 11. Troubleshooting Common Issues

### Security Jobs Not Running in MR Pipelines

**Solution:**
```yaml
variables:
  AST_ENABLE_MR_PIPELINES: "true"
```

### "Stage 'test' not defined" Error

**Solution:** Define stages explicitly
```yaml
stages:
  - test
  - deploy
```

### Dependency Scanning Fails to Find Dependencies

**NPM Solution:**
```yaml
build:
  script:
    - npm ci
  artifacts:
    paths:
      - package-lock.json
      - node_modules/

gemnasium-dependency_scanning:
  needs: ["build"]
```

**Python Solution:**
```yaml
gemnasium-python-dependency_scanning:
  before_script:
    - python setup.py install --user
```

### SAST Scanning Unwanted Paths

**Solution:** Explicitly exclude paths
```yaml
variables:
  SAST_EXCLUDED_PATHS: "spec,test,tests,tmp,vendor,node_modules,*.min.js"
```

### Secret Detection Taking Too Long

**Solution:** Limit commit range
```yaml
secret_detection:
  variables:
    SECRET_DETECTION_LOG_OPTIONS: "HEAD~5..HEAD"
    SECRET_DETECTION_HISTORIC_SCAN: "false"
```

### Reports Not Appearing in Security Dashboard

**Checklist:**
1. Verify report filename: `gl-{scan-type}-report.json`
2. Ensure report is in `$CI_PROJECT_DIR`
3. Check artifact configuration:
   ```yaml
   artifacts:
     reports:
       sast: gl-sast-report.json
   ```
4. Validate JSON against schema
5. Ensure job completed successfully

### Container Scanning Timeout

**Solution:**
```yaml
container_scanning:
  variables:
    TRIVY_TIMEOUT: "5m"
```

---

## 12. Additional Resources

### Official GitLab Documentation

- **Secret Detection:** https://docs.gitlab.com/user/application_security/secret_detection/
- **Dependency Scanning:** https://docs.gitlab.com/user/application_security/dependency_scanning/
- **SAST:** https://docs.gitlab.com/user/application_security/sast/
- **Security Dashboard:** https://docs.gitlab.com/user/application_security/security_dashboard/
- **Merge Request Approval Policies:** https://docs.gitlab.com/user/application_security/policies/merge_request_approval_policies/

### Template Repository

- **Security Templates:** `lib/gitlab/ci/templates/Jobs/` in GitLab repository
- **Schema Repository:** https://gitlab.com/gitlab-org/security-products/security-report-schemas

### Analyzer Repositories

- **Semgrep:** https://gitlab.com/gitlab-org/security-products/analyzers/semgrep
- **Container Scanning:** https://gitlab.com/gitlab-org/security-products/analyzers/container-scanning

### Version Compatibility

- Template paths using `Jobs/` prefix: GitLab 14.0+
- `AST_ENABLE_MR_PIPELINES` variable: GitLab 18.0+
- GitLab Advanced SAST: GitLab 17.1+ (Python), 17.3+ (JS/TS)
- Merge Request Approval Policies naming: GitLab 16.9+

---

## Conclusion

GitLab provides a comprehensive, native security scanning solution that integrates seamlessly with CI/CD pipelines. Key takeaways:

1. **Easy Setup** - Include templates, minimal configuration required
2. **Flexible Policies** - Warning or blocking modes with granular control
3. **Performance** - Optimizable to meet 5-minute targets for most projects
4. **Audit Ready** - Artifacts with configurable retention, PDF exports
5. **Multi-Level Visibility** - Project, group, and organization-wide dashboards

**Recommended Starting Point:**
```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/SAST.gitlab-ci.yml

variables:
  AST_ENABLE_MR_PIPELINES: "true"
```

Start with this basic configuration, monitor results for 1-2 weeks, then progressively add optimizations and policies based on your team's needs and security requirements.
