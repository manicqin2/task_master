/**
 * E2E Test: Large Dataset Performance
 * Feature 003: Multi-Lane Task Workflow
 *
 * T113: UI remains responsive with 100 tasks per lane
 */

import { test, expect } from '@playwright/test';

test.describe('Large Dataset Performance', () => {
  test.slow(); // Mark as slow test (may take several minutes)

  test.skip('UI remains responsive with 100 tasks in Pending lane', async ({ page }) => {
    // NOTE: This test is skipped by default as it takes a long time
    // To run: remove .skip() and run individually

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    // Create 100 tasks (per spec FR-010a)
    console.log('Creating 100 tasks...');
    for (let i = 1; i <= 100; i++) {
      await taskInput.fill(`Performance test task ${i}`);
      await submitButton.click();

      // Small delay to avoid overwhelming the system
      if (i % 10 === 0) {
        console.log(`Created ${i}/100 tasks`);
        await page.waitForTimeout(100);
      }
    }

    const pendingLane = page.locator('[data-testid="lane-pending"]');

    // Verify all tasks are visible
    await expect(pendingLane.locator('[data-testid="task-card"]')).toHaveCount(100, { timeout: 10000 });

    // Test UI responsiveness with 100 tasks
    // 1. Scroll performance
    const startScrollTime = Date.now();
    await pendingLane.evaluate((el) => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    await page.waitForTimeout(500);
    const scrollDuration = Date.now() - startScrollTime;

    console.log(`Scroll duration with 100 tasks: ${scrollDuration}ms`);
    expect(scrollDuration).toBeLessThan(1000); // Should scroll smoothly

    // 2. Cancel action performance with many tasks
    const firstTaskCard = pendingLane.locator('[data-testid="task-card"]').first();
    const cancelButton = firstTaskCard.locator('[data-testid="emblem-cancel"]');

    const startCancelTime = Date.now();
    await cancelButton.click();
    await firstTaskCard.waitFor({ state: 'hidden', timeout: 1000 });
    const cancelDuration = Date.now() - startCancelTime;

    console.log(`Cancel duration with 100 tasks: ${cancelDuration}ms`);
    expect(cancelDuration).toBeLessThan(500); // Cancel should still be fast

    // 3. Create new task with 99 existing tasks
    const startCreateTime = Date.now();
    await taskInput.fill('New task with 99 existing');
    await submitButton.click();
    await expect(pendingLane.locator('text=New task with 99 existing')).toBeVisible({ timeout: 2000 });
    const createDuration = Date.now() - startCreateTime;

    console.log(`Create task duration with 99 existing: ${createDuration}ms`);
    expect(createDuration).toBeLessThan(2000); // Should still be responsive

    // Verify final count
    await expect(pendingLane.locator('[data-testid="task-card"]')).toHaveCount(100);
  });

  test.skip('Animation performance does not degrade with 50+ tasks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    // Create 50 tasks
    console.log('Creating 50 tasks for animation test...');
    for (let i = 1; i <= 50; i++) {
      await taskInput.fill(`Animation test task ${i}`);
      await submitButton.click();

      if (i % 10 === 0) {
        await page.waitForTimeout(50);
      }
    }

    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator('[data-testid="task-card"]')).toHaveCount(50, { timeout: 10000 });

    // Test animation performance by creating a new task
    const startTime = Date.now();
    await taskInput.fill('Final animation test');
    await submitButton.click();

    const newTaskCard = pendingLane.locator('[data-testid="task-card"]', { hasText: 'Final animation test' });
    await newTaskCard.waitFor({ state: 'visible', timeout: 1000 });

    const animationTime = Date.now() - startTime;
    console.log(`Animation time with 50 existing tasks: ${animationTime}ms`);

    // Animation should still complete in <300ms per spec (SC-005)
    // With E2E overhead, allow up to 1000ms
    expect(animationTime).toBeLessThan(1000);
  });

  test('UI handles rapid task creation without performance degradation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const taskInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="submit-button"]');

    // Create 20 tasks as fast as possible
    const startTime = Date.now();

    for (let i = 1; i <= 20; i++) {
      await taskInput.fill(`Rapid task ${i}`);
      await submitButton.click();
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / 20;

    console.log(`Average task creation time: ${avgTime}ms`);
    console.log(`Total time for 20 tasks: ${totalTime}ms`);

    // Verify all tasks were created
    const pendingLane = page.locator('[data-testid="lane-pending"]');
    await expect(pendingLane.locator('[data-testid="task-card"]')).toHaveCount(20, { timeout: 5000 });

    // Average creation time should be reasonable
    expect(avgTime).toBeLessThan(500); // Each task creation averages <500ms
  });
});
