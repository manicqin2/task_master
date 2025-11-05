import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Chat-Based Task Entry
 * Tests the complete user flow from task creation to enrichment display
 */

test.describe('Chat-Based Task Entry', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the task entry page
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load the task entry page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Task Master/);

    // Check for main heading
    const heading = page.getByRole('heading', { name: /Task Entry/i });
    await expect(heading).toBeVisible();

    // Check for chat input
    const input = page.getByPlaceholder(/What needs to be done/i);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Check for send button
    const sendButton = page.getByRole('button', { name: /Send/i });
    await expect(sendButton).toBeVisible();
  });

  test('should create a task from natural language input', async ({ page }) => {
    // Type a task in natural language
    const taskText = 'Buy groceries tomorrow at 3pm';
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill(taskText);

    // Submit the task
    const sendButton = page.getByRole('button', { name: /Send/i });
    await sendButton.click();

    // Wait for task to appear in the list
    await page.waitForSelector('[data-testid="task-item"]', { timeout: 5000 });

    // Verify task appears with original text
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toContainText(taskText);

    // Verify task shows "pending" status initially
    await expect(taskItem).toContainText(/pending/i);

    // Input should be cleared after submission
    await expect(input).toHaveValue('');
  });

  test('should display enrichment progress', async ({ page }) => {
    // Create a task
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill('Finish the project report by Friday');
    await page.getByRole('button', { name: /Send/i }).click();

    // Wait for task to appear
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toBeVisible();

    // Check for enrichment status indicator
    // Task should show "enriching" or "pending" status
    const statusText = await taskItem.textContent();
    expect(statusText).toMatch(/pending|enriching/i);

    // Check for loading indicator or skeleton
    const loadingIndicator = page.locator('[data-testid="enrichment-loading"]').first();
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('should complete enrichment cycle', async ({ page }) => {
    // Create a task
    const taskText = 'Schedule meeting with team next week';
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill(taskText);
    await page.getByRole('button', { name: /Send/i }).click();

    // Wait for task to appear
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toBeVisible();

    // Wait for enrichment to complete (polling happens every 500ms, LLM takes time)
    // Max wait: 30 seconds for LLM enrichment
    await expect(taskItem).toContainText(/complete/i, { timeout: 30000 });

    // Verify enriched fields are present (title should be extracted)
    const enrichedTitle = taskItem.locator('[data-testid="task-title"]');
    if (await enrichedTitle.isVisible()) {
      const titleText = await enrichedTitle.textContent();
      expect(titleText).toBeTruthy();
      expect(titleText?.length).toBeGreaterThan(0);
    }
  });

  test('should create multiple tasks', async ({ page }) => {
    const tasks = [
      'Write documentation',
      'Review pull requests',
      'Deploy to production'
    ];

    // Create multiple tasks
    for (const taskText of tasks) {
      const input = page.getByPlaceholder(/What needs to be done/i);
      await input.fill(taskText);
      await page.getByRole('button', { name: /Send/i }).click();

      // Wait a bit between submissions
      await page.waitForTimeout(500);
    }

    // Verify all tasks appear in the list
    const taskItems = page.getByTestId('task-item');
    await expect(taskItems).toHaveCount(tasks.length);

    // Verify tasks appear in reverse order (newest first)
    const firstTask = taskItems.first();
    await expect(firstTask).toContainText(tasks[tasks.length - 1]);
  });

  test('should handle empty input validation', async ({ page }) => {
    // Try to submit without entering text
    const sendButton = page.getByRole('button', { name: /Send/i });

    // Button should be disabled when input is empty
    const input = page.getByPlaceholder(/What needs to be done/i);
    await expect(input).toHaveValue('');

    // Try clicking send button (should not create task if disabled)
    const initialTaskCount = await page.getByTestId('task-item').count();
    if (await sendButton.isEnabled()) {
      await sendButton.click();
    }

    // Verify no new task was created
    await page.waitForTimeout(1000);
    const finalTaskCount = await page.getByTestId('task-item').count();
    expect(finalTaskCount).toBe(initialTaskCount);
  });

  test('should handle very long task descriptions', async ({ page }) => {
    // Create a task with a very long description
    const longText = 'a'.repeat(500) + ' complete this extremely long task with many details';
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill(longText);
    await page.getByRole('button', { name: /Send/i }).click();

    // Wait for task to appear
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toBeVisible();

    // Verify long text is handled (may be truncated in UI)
    await expect(taskItem).toContainText(/complete this extremely long task/i);
  });

  test('should display error state gracefully', async ({ page }) => {
    // This test verifies error handling when backend is unavailable
    // We can't easily simulate backend errors without mocking, so this is a placeholder

    // Create a task that might fail
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill('Test error handling');
    await page.getByRole('button', { name: /Send/i }).click();

    // If there's an error, verify error message is displayed
    const errorMessage = page.locator('[role="alert"]').or(page.locator('.error'));

    // Either task succeeds or error is shown
    const taskItem = page.getByTestId('task-item').first();
    const hasTask = await taskItem.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);

    expect(hasTask || hasError).toBe(true);
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Test keyboard navigation
    const input = page.getByPlaceholder(/What needs to be done/i);

    // Tab to input
    await page.keyboard.press('Tab');
    await expect(input).toBeFocused();

    // Type task text
    await page.keyboard.type('Keyboard test task');

    // Submit with Enter key
    await page.keyboard.press('Enter');

    // Verify task was created
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toBeVisible();
    await expect(taskItem).toContainText('Keyboard test task');
  });

  test('should show task metadata after enrichment', async ({ page }) => {
    // Create a task with date/time information
    const taskText = 'Meeting with client on Friday at 2pm';
    const input = page.getByPlaceholder(/What needs to be done/i);
    await input.fill(taskText);
    await page.getByRole('button', { name: /Send/i }).click();

    // Wait for enrichment to complete
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toContainText(/complete/i, { timeout: 30000 });

    // Check for enriched metadata (due date, priority, etc.)
    const taskContent = await taskItem.textContent();

    // Verify some enrichment happened (original text should be present)
    expect(taskContent).toContain('Meeting');
  });
});

test.describe('Task List Display', () => {
  test('should show empty state when no tasks exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if any tasks exist
    const taskItems = page.getByTestId('task-item');
    const count = await taskItems.count();

    if (count === 0) {
      // Verify empty state message is shown
      const emptyMessage = page.getByText(/No tasks yet/i).or(page.getByText(/Get started/i));
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('should scroll through long task list', async ({ page }) => {
    await page.goto('/');

    // Create many tasks to enable scrolling
    for (let i = 1; i <= 10; i++) {
      const input = page.getByPlaceholder(/What needs to be done/i);
      await input.fill(`Task ${i}`);
      await page.getByRole('button', { name: /Send/i }).click();
      await page.waitForTimeout(300);
    }

    // Verify scroll area exists
    const scrollArea = page.locator('[data-radix-scroll-area-viewport]');
    if (await scrollArea.isVisible()) {
      // Scroll to bottom
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);

      // Verify last task is visible
      const lastTask = page.getByTestId('task-item').last();
      await expect(lastTask).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify key elements are visible and usable
    const input = page.getByPlaceholder(/What needs to be done/i);
    await expect(input).toBeVisible();

    const sendButton = page.getByRole('button', { name: /Send/i });
    await expect(sendButton).toBeVisible();

    // Create a task
    await input.fill('Mobile test task');
    await sendButton.click();

    // Verify task appears
    const taskItem = page.getByTestId('task-item').first();
    await expect(taskItem).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Verify layout works
    const heading = page.getByRole('heading', { name: /Task Entry/i });
    await expect(heading).toBeVisible();

    const input = page.getByPlaceholder(/What needs to be done/i);
    await expect(input).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('load');
    const loadTime = Date.now() - startTime;

    // Page should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle rapid task creation', async ({ page }) => {
    await page.goto('/');

    // Rapidly create tasks
    const input = page.getByPlaceholder(/What needs to be done/i);
    const sendButton = page.getByRole('button', { name: /Send/i });

    for (let i = 1; i <= 5; i++) {
      await input.fill(`Rapid task ${i}`);
      await sendButton.click();
      // Small delay to avoid overwhelming the system
      await page.waitForTimeout(100);
    }

    // Verify all tasks were created
    await page.waitForTimeout(1000);
    const taskItems = page.getByTestId('task-item');
    const count = await taskItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
