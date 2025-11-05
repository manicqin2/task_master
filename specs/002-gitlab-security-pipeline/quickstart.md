# Quickstart Guide: GitLab Security Scanning Pipeline

**Feature**: 002-gitlab-security-pipeline
**Estimated Setup Time**: 30 minutes
**Prerequisites**: GitLab account, project repository

## Overview

This guide walks you through setting up automated security scanning for your GitLab repository, including secret detection, dependency vulnerability scanning, and static code analysis.

## Prerequisites

### Required
- ✅ GitLab account with Maintainer role or higher
- ✅ GitLab CI/CD enabled for your project
- ✅ At least one GitLab Runner available (shared or self-hosted)
- ✅ Project uses Python and/or JavaScript/TypeScript

### Recommended
- ⭐ GitLab Premium or Ultimate license (for full dependency scanning features)
- ⭐ Protected branch configured (e.g., `main` or `master`)
- ⭐ Basic understanding of GitLab CI/CD pipelines

### Check Your Setup

Run these commands to verify prerequisites:

```bash
# Check if you have Maintainer access
# Navigate to: Project → Members → Your role should be Maintainer or Owner

# Verify GitLab CI/CD is enabled
# Navigate to: Settings → CI/CD → Expand "General pipelines"
# Ensure "CI/CD pipelines" toggle is enabled

# Check for available runners
# Navigate to: Settings → CI/CD → Runners
# You should see at least one active runner (green dot)
```

---

## Step 1: Add Security Scanning Template (5 minutes)

Create or update `.gitlab-ci.yml` in your repository root:

```yaml
# .gitlab-ci.yml

# Include GitLab's security scanning templates
include:
  - template: Security/Secret-Detection.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - template: Security/SAST.gitlab-ci.yml

# Define pipeline stages
stages:
  - test
  - security

# (Optional) Override default security job settings
secret_detection:
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "false"  # Faster: only scan changed files
    SECRET_DETECTION_EXCLUDED_PATHS: "tests/,docs/"

dependency_scanning:
  variables:
    DS_EXCLUDED_PATHS: "tests/,docs/"

sast:
  variables:
    SAST_EXCLUDED_PATHS: "tests/,docs/,migrations/"
  allow_failure: true  # Don't block MRs on SAST findings (human review required)
```

**Commit and push:**

```bash
git add .gitlab-ci.yml
git commit -m "Add security scanning pipeline"
git push origin main
```

**Verify:**
- Navigate to: CI/CD → Pipelines
- You should see a new pipeline running
- Check that `secret_detection`, `dependency_scanning`, and `sast` jobs appear

---

## Step 2: Configure Protected Branches (3 minutes)

Ensure your main branch requires pipeline success before merge:

1. Navigate to: **Settings → Repository → Protected branches**
2. Find your main branch (e.g., `main` or `master`)
3. **Edit** the branch protection:
   - ✅ **Allowed to push**: Maintainers only
   - ✅ **Allowed to merge**: Developers + Maintainers
   - ✅ **Require approval from code owners**: Off (or per your workflow)
   - ✅ **Pipelines must succeed**: **ON** (critical!)
4. **Protect** the branch

**Why this matters**: This ensures no code with detected secrets or vulnerabilities can be merged to your main branch without pipeline approval.

---

## Step 3: Run Your First Security Scan (5 minutes)

Create a test merge request to trigger security scanning:

```bash
# Create a new branch
git checkout -b test-security-scan

# Make a trivial change (e.g., add a comment to README)
echo "# Security scanning enabled" >> README.md

# Commit and push
git add README.md
git commit -m "Test security scanning pipeline"
git push origin test-security-scan
```

**Create merge request:**
1. Navigate to: **Merge Requests → New merge request**
2. Source branch: `test-security-scan`
3. Target branch: `main`
4. **Create merge request**

**Monitor pipeline:**
- The MR should automatically trigger a pipeline
- Watch the **Pipelines** tab on the merge request
- Wait for `secret_detection`, `dependency_scanning`, and `sast` jobs to complete (~2-5 minutes)

**Expected result:**
- ✅ All security jobs should **pass** (if your code is clean)
- If any job fails, proceed to **Step 4: Interpreting Results**

---

## Step 4: Interpreting Results (5 minutes)

### Viewing Security Reports

**Option 1: Merge Request Security Widget** (Recommended)
1. Open your merge request
2. Scroll to the **Security & Compliance** section
3. You'll see tabs for:
   - **Secret Detection**
   - **Dependency Scanning**
   - **SAST**
4. Click each tab to see findings (if any)

**Option 2: Pipeline Job Artifacts**
1. Navigate to: **CI/CD → Pipelines → Select your pipeline**
2. Click on a security job (e.g., `secret_detection`)
3. Click **Browse** next to artifacts
4. Download `gl-secret-detection-report.json` to view raw findings

**Option 3: Security Dashboard** (Premium/Ultimate only)
1. Navigate to: **Security & Compliance → Vulnerability Report**
2. View all vulnerabilities across all branches
3. Filter by severity, scanner, status

### Understanding Severity Levels

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Immediate security risk (e.g., exposed API key) | ❌ Merge **blocked** |
| **High** | Significant security risk (e.g., SQL injection) | ❌ Merge **blocked** |
| **Medium** | Moderate risk requiring review | ⚠️ **Warning** or require approval |
| **Low** | Minor issue, fix when convenient | ℹ️ **Informational** |

---

## Step 5: Handling Security Findings (10 minutes)

### If Secret Detection Finds a Secret

**Example finding:**
```
Secret detected: AWS Access Key
File: backend/src/config.py
Line: 42
Severity: Critical
```

**How to fix:**
1. **Remove the secret** from the code
2. **Rotate the credential** (generate a new key in AWS console)
3. **Use environment variables** instead:

```python
# ❌ BEFORE (hardcoded secret)
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"

# ✅ AFTER (environment variable)
import os
AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY")
```

4. Commit the fix and push
5. Pipeline will re-run and should pass

### If Dependency Scanning Finds a CVE

**Example finding:**
```
Vulnerability: Prototype Pollution in lodash
Package: lodash@4.17.20
Severity: High
CVE: CVE-2020-8203
Fix: Upgrade to lodash@4.17.21
```

**How to fix:**

**For npm (JavaScript/TypeScript):**
```bash
npm update lodash
# or
npm install lodash@4.17.21
```

**For Python:**
```bash
pip install --upgrade lodash-equivalent-package
# Update requirements.txt or pyproject.toml
```

Commit and push the updated lock file.

### If SAST Finds a Code Issue

**Example finding:**
```
Issue: SQL Injection
File: backend/src/db/queries.py
Line: 78
Severity: High
```

**How to fix:**

```python
# ❌ BEFORE (vulnerable to SQL injection)
query = f"SELECT * FROM users WHERE username = '{username}'"
result = db.execute(query)

# ✅ AFTER (parameterized query)
query = "SELECT * FROM users WHERE username = ?"
result = db.execute(query, (username,))
```

**Note**: SAST findings are **warning-only** by default (they don't block merge). Review and fix during code review.

---

## Step 6: Handling False Positives (5 minutes)

Sometimes scanners detect issues that aren't real vulnerabilities.

### Example: Documentation Contains Example API Keys

If your `docs/api-guide.md` contains:
```markdown
Example API key: `EXAMPLE_API_KEY_12345`
```

Secret detection will flag this as a potential secret.

### Solution: Add Path Exclusions

Update `.gitlab-ci.yml`:

```yaml
secret_detection:
  variables:
    SECRET_DETECTION_EXCLUDED_PATHS: "docs/**/*.md,tests/**"
```

Or create a `.gitleaksignore` file:

```
# .gitleaksignore
docs/**/*.md
tests/**/*.py
```

Commit and push. The excluded files will no longer be scanned.

---

## Step 7: Set Up Security Policies (Optional, 10 minutes)

For advanced control over which findings block merges, create a policy file:

```yaml
# .gitlab/security-policies.yml

schema_version: "1.0"

secret_detection_policy:
  enabled: true
  rules:
    - severity: critical
      action: block_merge
    - severity: high
      action: block_merge
    - severity: medium
      action: warn_only

dependency_scanning_policy:
  enabled: true
  rules:
    - severity: critical
      action: block_merge
    - severity: high
      action: require_approval
      required_approvals: 1
```

**Commit and push:**

```bash
mkdir -p .gitlab
git add .gitlab/security-policies.yml
git commit -m "Add security policies"
git push origin main
```

---

## Troubleshooting

### Pipeline Takes Too Long (>5 minutes)

**Solution**: Enable differential scanning (only scan changed files)

```yaml
secret_detection:
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "false"  # Only scan commit range
```

### Dependency Scanning Not Working

**Check GitLab tier:**
- Dependency Scanning requires **GitLab Ultimate** license
- Secret Detection and SAST work on **GitLab Free**

**Verify package files exist:**
```bash
ls package.json package-lock.json  # For npm
ls pyproject.toml requirements.txt  # For Python
```

### SAST Not Detecting Language

**Check supported languages:**
- JavaScript/TypeScript: ✅ Supported (Semgrep)
- Python: ✅ Supported (Semgrep)
- Java: ⚠️ Requires additional configuration
- Go: ⚠️ Requires additional configuration

Add explicit analyzer configuration:

```yaml
sast:
  variables:
    SAST_EXCLUDED_ANALYZERS: "bandit,brakeman"  # Disable unwanted analyzers
```

### Job Failing with "No runner available"

**Solution**: Enable shared runners or register a project runner

1. Navigate to: **Settings → CI/CD → Runners**
2. **Enable shared runners** (if available)
3. Or **register a specific runner** following GitLab docs

---

## Next Steps

### Enable Security Dashboard (Premium/Ultimate)
1. Navigate to: **Security & Compliance → Vulnerability Report**
2. View historical vulnerability trends
3. Set up recurring security scans

### Integrate with Slack/Email Notifications
1. Navigate to: **Settings → Integrations → Slack notifications**
2. Configure webhook URL
3. Enable "Pipeline" events

### Set Up Scheduled Scans
```yaml
# Run security scans nightly on main branch
nightly_security_scan:
  extends: secret_detection
  only:
    - schedules
```

### Customize Scanning Rules

Create custom Semgrep rules for SAST:
```yaml
# .semgrep.yml
rules:
  - id: custom-rule
    pattern: "dangerous_function(...)"
    message: "Avoid using dangerous_function"
    severity: WARNING
```

---

## Quick Reference

### Useful Commands

```bash
# Validate .gitlab-ci.yml syntax
gitlab-ci-lint .gitlab-ci.yml

# View security report artifacts locally
cat gl-secret-detection-report.json | jq '.vulnerabilities'

# Check GitLab CI/CD status
curl "https://gitlab.com/api/v4/projects/:id/pipelines?private_token=YOUR_TOKEN"
```

### Important Files

| File | Purpose | Required |
|------|---------|----------|
| `.gitlab-ci.yml` | Pipeline configuration | ✅ Yes |
| `.gitlab/security-policies.yml` | Security policies | ❌ Optional |
| `.gitleaksignore` | Secret detection exclusions | ❌ Optional |
| `.semgrep.yml` | Custom SAST rules | ❌ Optional |

### Support Resources

- **GitLab Security Docs**: https://docs.gitlab.com/ee/user/application_security/
- **Secret Detection**: https://docs.gitlab.com/ee/user/application_security/secret_detection/
- **Dependency Scanning**: https://docs.gitlab.com/ee/user/application_security/dependency_scanning/
- **SAST**: https://docs.gitlab.com/ee/user/application_security/sast/

---

## Success Checklist

After completing this quickstart, verify:

- ✅ `.gitlab-ci.yml` includes security scanning templates
- ✅ Protected branch requires pipeline success
- ✅ Test merge request triggered security scans
- ✅ You can view security findings in the MR
- ✅ You understand how to fix common findings (secrets, CVEs, code issues)
- ✅ You know how to handle false positives (exclusions)

**Congratulations!** Your repository is now protected by automated security scanning.
