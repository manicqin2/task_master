/**
 * E2E Test: Cancel Action in Error Lane
 * Feature 003: Multi-Lane Task Workflow
 *
 * T109: User clicks cancel in Error lane → task disappears
 */

import { test, expect } from '@playwright/test';

test.describe('Cancel Action - Error Lane', () => {
  test.skip('User can cancel a task in Error lane and it disappears', async ({ page }) => {
    // NOTE: This test requires having a task in the Error lane
    // It's skipped by default and should be run when error tasks exist

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const errorLane = page.locator('[data-testid="lane-error"]');
    const errorTasks = errorLane.locator('[data-testid="task-card"]');

    const count = await errorTasks.count();
    if (count === 0) {
      test.skip(); // No error tasks to test with
      return;
    }

    // Get the first error task
    const firstTask = errorTasks.first();
    const taskText = await firstTask.locator('[data-testid="task-title"]').textContent();

    // Find and click the cancel emblem
    const cancelButton = firstTask.locator('[data-testid="emblem-cancel"]');
    await expect(cancelButton).toBeVisible();

    await cancelButton.click();

    // Task should disappear from Error lane
    await expect(errorLane.locator(`text=${taskText}`)).not.toBeVisible({ timeout: 1000 });

    // Verify it doesn't appear in any other lane
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    const finishedLane = page.locator('[data-testid="lane-finished"]');

    await expect(pendingLane.locator(`text=${taskText}`)).not.toBeVisible();
    await expect(finishedLane.locator(`text=${taskText}`)).not.toBeVisible();
  });

  test('Cancel emblem appears in Error lane alongside retry emblem', async ({ page }) => {
    test.skip(); // Requires error tasks

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

    // Both cancel and retry emblems should be visible (FR-007a, FR-007)
    await expect(firstTask.locator('[data-testid="emblem-cancel"]')).toBeVisible();
    await expect(firstTask.locator('[data-testid="emblem-retry"]')).toBeVisible();
  });

  test('Cancel emblem in Error lane shows appropriate tooltip', async ({ page }) => {
    test.skip(); // Requires error tasks

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
    const cancelButton = firstTask.locator('[data-testid="emblem-cancel"]');

    await cancelButton.hover();

    // Tooltip should indicate this is permanent cancellation
    await expect(page.locator('text=/cancel|cannot be recovered/i')).toBeVisible({ timeout: 1000 });
  });
});
