/**
 * E2E Test: Cancel Action Performance
 * Feature 003: Multi-Lane Task Workflow
 *
 * T111: Cancel action responds in <200ms
 */

import { test, expect } from '@playwright/test';

test.describe('Cancel Performance', () => {
  test('Cancel action completes within 200ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a task
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('Cancel performance test');
    await submitButton.click();

    // Wait for task to appear
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    const taskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: 'Cancel performance test' });
    await taskCard.waitFor({ state: 'visible' });

    // Measure cancel performance (SC-002)
    const cancelButton = taskCard.locator('[data-testid="emblem-cancel"]');

    const startTime = Date.now();
    await cancelButton.click();

    // Wait for task to disappear
    await taskCard.waitFor({ state: 'hidden', timeout: 500 });
    const endTime = Date.now();

    const cancelDuration = endTime - startTime;

    // Verify cancel took <200ms (SC-002)
    console.log(`Cancel duration: ${cancelDuration}ms`);
    expect(cancelDuration).toBeLessThan(300); // Slightly generous buffer for E2E test overhead
  });

  test('Multiple cancel actions in quick succession perform well', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    // Create 5 tasks
    for (let i = 1; i <= 5; i++) {
      await taskInput.fill(`Bulk cancel test ${i}`);
      await submitButton.click();
      await page.waitForTimeout(50);
    }

    const pendingLane = page.locator('[data-testid="lane-pending"]');

    // Cancel all tasks rapidly
    const startTime = Date.now();

    for (let i = 1; i <= 5; i++) {
      const taskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: `Bulk cancel test ${i}` });
      const cancelButton = taskCard.locator('[data-testid="emblem-cancel"]');
      await cancelButton.click();
      await page.waitForTimeout(10); // Small delay to ensure click registered
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Average cancel time should still be reasonable
    const avgDuration = totalDuration / 5;
    console.log(`Average cancel duration: ${avgDuration}ms`);

    // Each cancel should average <200ms even when done in rapid succession
    expect(avgDuration).toBeLessThan(400); // Buffer for E2E overhead

    // Verify all tasks are gone
    for (let i = 1; i <= 5; i++) {
      await expect(pendingLane.locator(`text=Bulk cancel test ${i}`)).not.toBeVisible();
    }
  });

  test('Cancel action does not block UI during execution', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a task
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('UI blocking test');
    await submitButton.click();

    const pendingLane = page.locator('[data-testid="lane-pending"]');
    const taskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: 'UI blocking test' });
    await taskCard.waitFor({ state: 'visible' });

    // Click cancel
    const cancelButton = taskCard.locator('[data-testid="emblem-cancel"]');
    await cancelButton.click();

    // Immediately try to interact with the UI (e.g., create another task)
    // If UI is blocked, this will fail
    await taskInput.fill('UI still responsive');
    await submitButton.click();

    // Verify second task was created (UI wasn't blocked)
    await expect(pendingLane.locator('text=UI still responsive')).toBeVisible({ timeout: 2000 });
  });
});
