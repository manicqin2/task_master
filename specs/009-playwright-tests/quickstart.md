# Quickstart: Playwright End-to-End Tests

**Feature**: 009-playwright-tests
**Date**: 2026-01-30

## Prerequisites

- Node.js 18+
- Docker and docker-compose (for running the application)
- Git

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers.

### 3. Start the Application

In one terminal, start the full application stack:

```bash
docker compose up
```

Or start just the frontend dev server (if backend is already running):

```bash
cd frontend
npm run dev
```

## Running Tests

### Run All E2E Tests

```bash
cd frontend
npx playwright test
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests with Visible Browser

```bash
npx playwright test --headed
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/task-entry.spec.ts
```

### Run Tests Matching Pattern

```bash
npx playwright test -g "should create a task"
```

### Run Tests in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Viewing Reports

### Open HTML Report

```bash
npx playwright show-report
```

This opens an interactive HTML report in your browser.

### Report Locations

- **HTML Report**: `frontend/playwright-report/index.html`
- **JUnit XML**: `frontend/test-results/e2e-junit-results.xml`
- **Screenshots**: `frontend/test-results/` (on failure)
- **Traces**: `frontend/test-results/` (on first retry)

## Debugging Failed Tests

### View Trace

When a test fails on CI, download the trace file and view it:

```bash
npx playwright show-trace path/to/trace.zip
```

### Debug Mode

Run tests with debugger:

```bash
npx playwright test --debug
```

### Step Through Test

Add `await page.pause()` in your test code to pause execution and inspect.

## Test Organization

```
frontend/tests/e2e/
├── fixtures/              # Shared setup
│   ├── test-fixtures.ts   # Extended fixtures
│   └── api-helpers.ts     # API utilities
├── pages/                 # Page Objects
│   ├── base.page.ts
│   ├── workbench.page.ts
│   └── todos.page.ts
├── task-entry.spec.ts     # Task creation tests
├── lane-workflow.spec.ts  # Lane transition tests
├── navigation.spec.ts     # Tab navigation tests
├── todo-management.spec.ts# Todo actions tests
└── edge-cases.spec.ts     # Edge case tests
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.locator('[data-testid="input"]').fill('test');

    // Act
    await page.locator('[data-testid="submit"]').click();

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Page Objects

```typescript
import { test, expect } from './fixtures/test-fixtures';

test('should create task via page object', async ({ workbenchPage }) => {
  await workbenchPage.goto();
  await workbenchPage.createTask('My new task');
  await expect(workbenchPage.pendingLane).toContainText('My new task');
});
```

## CI/CD Integration

Tests automatically run on CI with:

- Headless mode enabled
- Single worker (prevents resource contention)
- 2 retries on failure
- HTML and JUnit reports generated

### GitLab CI Example

```yaml
e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.51.0-jammy
  script:
    - cd frontend
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - frontend/playwright-report/
      - frontend/test-results/
    reports:
      junit: frontend/test-results/e2e-junit-results.xml
```

## Common Issues

### Tests Timing Out

- Increase timeout in config or specific test: `test.setTimeout(60000)`
- Check if application is running: `curl http://localhost:5173`
- Check backend health: `curl http://localhost:8000/health`

### Element Not Found

- Verify selector exists: Use `npx playwright codegen` to generate selectors
- Check if element is inside iframe or shadow DOM
- Ensure page has loaded: Use `await page.waitForLoadState('networkidle')`

### Flaky Tests

- Use web-first assertions: `await expect(locator).toBeVisible()`
- Avoid fixed timeouts: Use `waitFor` conditions instead
- Ensure test isolation: Clean up data in `beforeEach`

## Performance Testing

Performance tests measure:
- Task creation to visibility: < 2 seconds
- Animation frame rate: >= 30 FPS
- Large dataset handling: 50+ tasks without degradation

Run performance tests:

```bash
npx playwright test --grep "performance"
```
