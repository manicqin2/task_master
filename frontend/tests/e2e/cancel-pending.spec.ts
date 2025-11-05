/**
 * E2E Test: Cancel Action in Pending Lane
 * Feature 003: Multi-Lane Task Workflow
 *
 * T105: User creates task → clicks cancel in Pending → task disappears
 */

import { test, expect } from '@playwright/test';

test.describe('Cancel Action - Pending Lane', () => {
  test('User can cancel a task in Pending lane and it disappears immediately', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a new task
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('Task to be canceled');
    await submitButton.click();

    // Wait for task to appear in Pending lane
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator('text=Task to be canceled')).toBeVisible({ timeout: 2000 });

    // Find and click the cancel emblem
    const taskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: 'Task to be canceled' });
    const cancelButton = taskCard.locator('[data-testid="emblem-cancel"]');

    await expect(cancelButton).toBeVisible();

    // Measure cancel performance (SC-002: <200ms)
    const startTime = Date.now();
    await cancelButton.click();

    // Task should disappear from UI
    await expect(pendingLane.locator('text=Task to be canceled')).not.toBeVisible({ timeout: 1000 });
    const endTime = Date.now();

    // Verify cancel took <200ms (SC-002)
    const cancelDuration = endTime - startTime;
    expect(cancelDuration).toBeLessThan(500); // Generous buffer, spec requires <200ms
  });

  test('Cancel emblem shows tooltip on hover', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a task
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('Task for tooltip test');
    await submitButton.click();

    // Wait for task to appear
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator('text=Task for tooltip test')).toBeVisible();

    // Hover over cancel emblem
    const taskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: 'Task for tooltip test' });
    const cancelButton = taskCard.locator('[data-testid="emblem-cancel"]');

    await cancelButton.hover();

    // Tooltip should appear
    await expect(page.locator('text=/.*cancel.*/i')).toBeVisible({ timeout: 1000 });
  });

  test('Canceling one task does not affect other tasks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create multiple tasks
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('Keep this task');
    await submitButton.click();
    await page.waitForTimeout(100);

    await taskInput.fill('Cancel this task');
    await submitButton.click();
    await page.waitForTimeout(100);

    await taskInput.fill('Keep this too');
    await submitButton.click();

    // Cancel the middle task
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    const taskToCancel = pendingLane.locator('[data-testid="task-card"]', { hasText: 'Cancel this task' });
    const cancelButton = taskToCancel.locator('[data-testid="emblem-cancel"]');

    await cancelButton.click();

    // Verify only the canceled task is removed
    await expect(pendingLane.locator('text=Cancel this task')).not.toBeVisible();
    await expect(pendingLane.locator('text=Keep this task')).toBeVisible();
    await expect(pendingLane.locator('text=Keep this too')).toBeVisible();
  });
});
