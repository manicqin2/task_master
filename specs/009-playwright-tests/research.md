# Research: Playwright End-to-End Tests

**Feature**: 009-playwright-tests
**Date**: 2026-01-30
**Source**: Context7 Playwright documentation

## Research Tasks Completed

### 1. Playwright Test Organization Best Practices

**Decision**: Adopt Page Object Model (POM) pattern with extended fixtures

**Rationale**:
- Page objects simplify authoring by creating a higher-level API suited to the application
- Page objects simplify maintenance by capturing element selectors in one place
- Creates reusable code to avoid repetition across tests
- Each page object class encapsulates selectors and methods for interacting with a specific part of the application

**Implementation Pattern**:
```typescript
// Page Object Model structure
import type { Page, Locator } from '@playwright/test';

export class WorkbenchPage {
  private readonly inputBox: Locator;
  private readonly submitButton: Locator;
  private readonly pendingLane: Locator;

  constructor(public readonly page: Page) {
    this.inputBox = this.page.locator('[data-testid="chat-input"]');
    this.submitButton = this.page.locator('[data-testid="submit-button"]');
    this.pendingLane = this.page.locator('[data-testid="lane-pending"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async createTask(text: string) {
    await this.inputBox.fill(text);
    await this.submitButton.click();
  }
}
```

**Alternatives Considered**:
- Inline locators in each test: Rejected - leads to duplication and maintenance burden
- Utility functions only: Rejected - lacks the cohesion of page-scoped encapsulation

---

### 2. Test Isolation and Data Setup

**Decision**: Use `test.beforeEach` hooks with API helpers for clean state

**Rationale**:
- `test.beforeEach` ensures tests are isolated and start from a consistent state
- Improves reproducibility and prevents cascading failures
- Each test gets its own browser context by default in Playwright

**Implementation Pattern**:
```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to starting page
  await page.goto('/');
  // Clean up any existing test data via API
  await cleanupTestData();
});
```

**Alternatives Considered**:
- Shared state between tests: Rejected - leads to flaky tests and hidden dependencies
- Database reset before suite: Rejected - too coarse-grained, slows suite

---

### 3. API Mocking for Deterministic Tests

**Decision**: Use `page.route()` for mocking LLM enrichment responses in specific tests

**Rationale**:
- Real LLM calls are slow (30s timeout) and non-deterministic
- Mocking allows testing error scenarios deterministically
- `page.route()` intercepts network requests and returns custom responses

**Implementation Pattern**:
```typescript
await page.route('**/api/v1/tasks/*/enrich', async route => {
  await route.fulfill({
    status: 200,
    json: {
      status: 'completed',
      enriched_text: 'Mocked enrichment result',
      metadata: { project: 'Test Project' }
    }
  });
});
```

**When to Use Real API**:
- Happy path tests that verify full integration
- Performance tests measuring actual response times

**When to Mock**:
- Error scenario tests (simulate failures)
- Timeout scenario tests (simulate slow responses)
- Tests requiring deterministic metadata

**Alternatives Considered**:
- HAR file replay: Useful for complex scenarios but more setup
- Test-specific backend endpoints: Adds complexity to backend

---

### 4. CI/CD Configuration

**Decision**: Configure for headless mode with CI-specific settings

**Rationale**:
- `fullyParallel: true` for faster execution on multi-core CI runners
- `forbidOnly: !!process.env.CI` prevents accidental `.only` commits
- `retries: process.env.CI ? 2 : 0` handles flakiness in CI environment
- `workers: process.env.CI ? 1 : undefined` prevents resource contention

**Implementation Pattern**:
```typescript
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-junit-results.xml' }]
  ],
  use: {
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

**Alternatives Considered**:
- Parallel workers in CI: May cause resource issues, start with 1 worker
- No retries: Rejected - CI environments can have transient failures

---

### 5. Assertions and Wait Strategies

**Decision**: Use web-first assertions exclusively

**Rationale**:
- Web-first assertions automatically retry until conditions are met or timeout
- Eliminates manual waits and race conditions
- `await expect(locator).toBeVisible()` is the correct pattern

**Correct Pattern**:
```typescript
// ✓ Web-first assertion - waits automatically
await expect(page.locator('.status')).toHaveText('Submitted');
await expect(page.getByText('welcome')).toBeVisible();
```

**Incorrect Pattern (avoid)**:
```typescript
// ✗ Manual assertion - returns immediately without waiting
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

**Timeout Configuration**:
- Default test timeout: 30 seconds (matches LLM enrichment)
- Assertion timeout: Configurable via `testProject.expect`
- Individual assertion timeout: Pass directly to assertion

**Alternatives Considered**:
- `waitForSelector()` + manual assertions: Rejected - web-first assertions are cleaner
- Fixed delays: Rejected - leads to slow, flaky tests

---

### 6. Existing Test Coverage Analysis

**Current Tests in Codebase**:

| File | Coverage | Status |
|------|----------|--------|
| `task-entry.spec.ts` | Task creation, input validation | Complete - US1 |
| `lane-workflow.spec.ts` | Pending → Ready transition | Complete - US2 |
| `retry-workflow.spec.ts` | Error lane retry | Partial - US3 |
| `cancel-pending.spec.ts` | Cancel functionality | Complete - US3 |
| `cancel-error.spec.ts` | Cancel from error | Complete - US3 |
| `timeout-scenario.spec.ts` | 30s timeout | Complete - Edge case |
| `animation-performance.spec.ts` | Animation FPS | Complete - US6 |
| `large-dataset-performance.spec.ts` | 100+ tasks | Complete - US6 |

**Missing Tests (to be created)**:

| Spec File | User Story | Coverage Gap |
|-----------|------------|--------------|
| `navigation.spec.ts` | US4 | Tab switching between Workbench/Todos |
| `todo-management.spec.ts` | US5 | Todo completion, archive, toggle |
| `edge-cases.spec.ts` | Edge cases | Backend unavailable, long text, rapid submission |

---

### 7. Dependency Installation

**Decision**: Add `@playwright/test` as devDependency with browser installation script

**Implementation**:
```json
{
  "devDependencies": {
    "@playwright/test": "^1.51.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

**Post-install**: Run `npx playwright install` for browser binaries

---

## Summary of Decisions

| Area | Decision |
|------|----------|
| Test Organization | Page Object Model + Extended Fixtures |
| Test Isolation | `beforeEach` hooks with API cleanup |
| API Mocking | `page.route()` for deterministic scenarios |
| CI Configuration | Headless, single worker, retries on CI |
| Assertions | Web-first assertions only |
| Missing Coverage | Navigation, Todo management, Edge cases |
