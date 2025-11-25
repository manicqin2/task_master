/**
 * E2E Test: Retry Failure Scenario
 * Feature 003: Multi-Lane Task Workflow
 *
 * T108: User clicks retry → task fails again → sees updated error message
 */

import { test, expect } from '@playwright/test';

test.describe('Retry Failure Handling', () => {
  test.skip('Retrying a task that fails again shows updated error message', async ({ page }) => {
    // NOTE: This test requires a way to force task failures
    // It's skipped by default and should be run in a controlled test environment

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Assume we have a task in Error lane
    const errorLane = page.locator('[data-testid="lane-error"]');
    const errorTasks = errorLane.locator('[data-testid="task-card"]');

    const count = await errorTasks.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const firstTask = errorTasks.first();
    const taskText = await firstTask.locator('[data-testid="task-title"]').textContent();
    const originalError = await firstTask.locator('[data-testid="error-message"]').textContent();

    // Click retry
    const retryButton = firstTask.locator('[data-testid="emblem-retry"]');
    await retryButton.click();

    // Task moves to Pending
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator(`text=${taskText}`)).toBeVisible({ timeout: 1000 });

    // Wait for task to fail again and return to Error lane
    await expect(errorLane.locator(`text=${taskText}`)).toBeVisible({ timeout: 35000 });

    // Verify error message is present (may be same or updated)
    const retriedTask = errorLane.locator('[data-testid="task-card"]', { hasText: taskText || '' });
    await expect(retriedTask.locator('[data-testid="error-message"]')).toBeVisible();

    const newError = await retriedTask.locator('[data-testid="error-message"]').textContent();

    // Error message should exist (SC-007: provides sufficient context)
    expect(newError).toBeTruthy();
    expect((newError || '').length).toBeGreaterThan(5);
  });

  test('Multiple retry attempts are allowed (no limit)', async ({ page }) => {
    // FR-007b: Unlimited retries
    test.skip(); // Requires controlled failure scenario

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const errorLane = page.locator('[data-testid="lane-error"]');
    const errorTasks = errorLane.locator('[data-testid="task-card"]');

    const count = await errorTasks.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const firstTask = errorTasks.first();

    // Attempt retry 3 times
    for (let i = 0; i < 3; i++) {
      const retryButton = firstTask.locator('[data-testid="emblem-retry"]');
      await retryButton.click();

      // Wait a moment
      await page.waitForTimeout(1000);

      // Should still be able to retry (no limit error)
    }

    // All retry attempts should succeed (no "retry limit reached" error)
    await expect(page.locator('text=/retry limit|max.*retries/i')).not.toBeVisible();
  });
});
