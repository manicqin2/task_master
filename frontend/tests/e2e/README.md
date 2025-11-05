# End-to-End Testing with Playwright

This directory contains E2E tests for the Task Master application using Playwright.

## Setup

```bash
# Install dependencies (already done if you've run npm install)
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Prerequisites

The application must be running before executing E2E tests:

```bash
# Start the application with Docker Compose
cd ../..  # Go to project root
docker compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

### Run All Tests

```bash
# Run tests in headless mode (CI/CD)
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode (step through)
npm run test:e2e:debug
```

### Run Specific Tests

```bash
# Run a specific test file
npx playwright test task-entry.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should create a task"

# Run tests in a specific browser
npx playwright test --project=chromium
```

### View Test Report

```bash
# After running tests, view the HTML report
npm run test:e2e:report
```

## Test Structure

### Current Test Suites

1. **Chat-Based Task Entry** (`task-entry.spec.ts`)
   - Page load and initial state
   - Task creation from natural language
   - Enrichment progress and completion
   - Multiple task creation
   - Input validation
   - Error handling
   - Keyboard accessibility
   - Task metadata display

2. **Task List Display**
   - Empty state
   - Scrolling behavior
   - Task ordering

3. **Responsive Design**
   - Mobile viewport (375x667)
   - Tablet viewport (768x1024)

4. **Performance**
   - Page load time
   - Rapid task creation

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.getByTestId('my-element');

    // Act
    await element.click();

    // Assert
    await expect(element).toHaveText('Expected Text');
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
   ```tsx
   <div data-testid="task-item">...</div>
   ```

2. **Wait for network idle** after navigation
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use semantic selectors** when possible
   ```typescript
   page.getByRole('button', { name: 'Send' })
   page.getByPlaceholder('What needs to be done')
   ```

4. **Handle async operations** properly
   ```typescript
   await expect(element).toBeVisible({ timeout: 5000 });
   ```

5. **Clean up after tests** (if needed)
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clean up logic
   });
   ```

## Test Data

### Task Examples

Tests use various task descriptions to verify different scenarios:

- **Simple tasks**: "Buy groceries"
- **Tasks with dates**: "Meeting on Friday at 2pm"
- **Complex tasks**: "Finish the project report by end of week"
- **Long descriptions**: 500+ character strings

### Expected Behaviors

- Tasks appear in reverse chronological order (newest first)
- Enrichment status progresses: `pending` → `enriching` → `complete`
- LLM enrichment typically completes in <30 seconds
- UI polls for status updates every 500ms

## Debugging Tests

### Visual Debugging

```bash
# Run with headed browser
npm run test:e2e:headed

# Run with Playwright Inspector
npm run test:e2e:debug

# Generate trace on failure
# (automatically enabled in playwright.config.ts)
```

### Common Issues

1. **Tests timeout waiting for elements**
   - Check if Docker containers are running
   - Verify frontend is accessible at http://localhost:5173
   - Check browser console for errors

2. **Backend not responding**
   - Ensure backend is running: `curl http://localhost:8000/health`
   - Check Docker logs: `docker compose -f docker/docker-compose.yml logs backend`

3. **LLM enrichment timeout**
   - Ollama service may need more time to load model
   - Increase timeout in test: `{ timeout: 60000 }`
   - Check Ollama logs: `docker compose -f docker/docker-compose.yml logs ollama`

4. **Flaky tests**
   - Add explicit waits for dynamic content
   - Use `waitForLoadState('networkidle')`
   - Verify test data isn't affected by previous tests

## CI/CD Integration

### GitLab CI Example

```yaml
e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.56.1
  services:
    - docker:dind
  before_script:
    - docker compose -f docker/docker-compose.yml up -d
    - npm ci
  script:
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - frontend/playwright-report/
      - frontend/test-results/
    expire_in: 30 days
```

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Start application
  run: docker compose -f docker/docker-compose.yml up -d

- name: Run Playwright tests
  run: npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Environment Variables

Configure tests via environment variables:

```bash
# Frontend URL (default: http://localhost:5173)
BASE_URL=http://localhost:5173 npm run test:e2e

# Run in CI mode (more retries, stricter checks)
CI=true npm run test:e2e
```

## Performance Benchmarks

Expected test execution times (on local machine):

- Single test: 5-10 seconds
- Full test suite: 2-5 minutes
- With headed browser: +20-30% time
- With trace/video: +10-15% time

## Accessibility Testing

Tests include basic keyboard navigation checks. For comprehensive accessibility testing, consider adding:

```bash
npm install --save-dev @axe-core/playwright
```

Then add to tests:

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
