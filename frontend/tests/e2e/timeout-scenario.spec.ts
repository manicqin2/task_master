/**
 * E2E Test: Timeout Scenario
 * Feature 003: Multi-Lane Task Workflow
 *
 * T107: User creates task → backend unavailable → timeout after 30s → task moves to Error lane
 */

import { test, expect } from '@playwright/test';

test.describe('Timeout Detection', () => {
  test.skip('Task moves to Error lane after 30s timeout when backend unavailable', async ({ page }) => {
    // NOTE: This test is skipped by default as it requires:
    // 1. Stopping the backend service
    // 2. Waiting 30+ seconds
    // 3. Restarting the backend
    //
    // To run this test manually:
    // 1. Stop backend: docker compose stop backend
    // 2. Remove .skip() from this test
    // 3. Run: npm run test:e2e -- timeout-scenario.spec.ts
    // 4. Restart backend: docker compose start backend

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a task (backend is stopped, so it will timeout)
    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    await taskInput.fill('Task that will timeout');
    await submitButton.click();

    // Task should appear in Pending lane
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator('text=Task that will timeout')).toBeVisible({ timeout: 2000 });

    // Wait for timeout detection (30 seconds per spec FR-003a)
    // Add 1 second buffer for detection logic
    await page.waitForTimeout(31000);

    // Task should move to Error lane with timeout message
    const errorLane = page.locator('[data-testid="lane-error"]');
    await expect(errorLane.locator('text=Task that will timeout')).toBeVisible({ timeout: 2000 });

    // Verify error message indicates backend unavailability (SC-008)
    const taskCard = errorLane.locator('[data-testid="task-card"]', { hasText: 'Task that will timeout' });
    await expect(taskCard.locator('text=/backend unavailable|retry when online/i')).toBeVisible();

    // Verify task is no longer in Pending lane
    await expect(pendingLane.locator('text=Task that will timeout')).not.toBeVisible();
  });

  test('Timeout detection accuracy is within spec (30s ± 1s)', async ({ page }) => {
    // This test verifies the timing accuracy of timeout detection
    // It's marked as skip because it requires backend to be stopped

    test.skip();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    const startTime = Date.now();

    await taskInput.fill('Timeout accuracy test');
    await submitButton.click();

    // Wait for task to appear in Error lane
    const errorLane = page.locator('[data-testid="lane-error"]');
    await expect(errorLane.locator('text=Timeout accuracy test')).toBeVisible({ timeout: 35000 });

    const endTime = Date.now();
    const timeoutDuration = endTime - startTime;

    // Verify timeout is 30s ± 1s (SC-008)
    expect(timeoutDuration).toBeGreaterThanOrEqual(29000);
    expect(timeoutDuration).toBeLessThanOrEqual(31000);
  });
});
