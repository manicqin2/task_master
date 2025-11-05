/**
 * Integration Test: Timeout Detection
 * Feature 003: Multi-Lane Task Workflow
 *
 * T100: Timeout detection moves task to Error lane after 30s
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTimeoutDetection } from '../../src/hooks/useTimeoutDetection';

describe('Timeout Detection Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger timeout callback after 30 seconds for pending task', async () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-123';

    renderHook(() => useTimeoutDetection(taskId, 'pending', onTimeout));

    // Fast-forward 29 seconds (should not trigger)
    vi.advanceTimersByTime(29000);
    expect(onTimeout).not.toHaveBeenCalled();

    // Fast-forward to 30 seconds (should trigger)
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledWith(taskId);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('should trigger timeout callback after 30 seconds for processing task', async () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-456';

    renderHook(() => useTimeoutDetection(taskId, 'processing', onTimeout));

    // Fast-forward to 30 seconds
    vi.advanceTimersByTime(30000);

    expect(onTimeout).toHaveBeenCalledWith(taskId);
  });

  it('should NOT trigger timeout for completed task', () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-789';

    renderHook(() => useTimeoutDetection(taskId, 'completed', onTimeout));

    // Fast-forward past 30 seconds
    vi.advanceTimersByTime(35000);

    // Should not have called timeout
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should NOT trigger timeout for failed task', () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-abc';

    renderHook(() => useTimeoutDetection(taskId, 'failed', onTimeout));

    // Fast-forward past 30 seconds
    vi.advanceTimersByTime(35000);

    // Should not have called timeout
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should cancel timeout when task status changes from pending', () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-def';

    const { rerender } = renderHook(
      ({ status }) => useTimeoutDetection(taskId, status, onTimeout),
      { initialProps: { status: 'pending' as const } }
    );

    // Fast-forward 20 seconds
    vi.advanceTimersByTime(20000);

    // Change status to completed
    rerender({ status: 'completed' as const });

    // Fast-forward another 15 seconds (total 35s)
    vi.advanceTimersByTime(15000);

    // Should not have triggered timeout
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should clean up timeout on unmount', () => {
    const onTimeout = vi.fn();
    const taskId = 'test-task-ghi';

    const { unmount } = renderHook(() => useTimeoutDetection(taskId, 'pending', onTimeout));

    // Fast-forward 20 seconds
    vi.advanceTimersByTime(20000);

    // Unmount the hook
    unmount();

    // Fast-forward another 15 seconds (total 35s)
    vi.advanceTimersByTime(15000);

    // Should not have triggered timeout after unmount
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('should reset timeout when task ID changes', () => {
    const onTimeout = vi.fn();

    const { rerender } = renderHook(
      ({ taskId }) => useTimeoutDetection(taskId, 'pending', onTimeout),
      { initialProps: { taskId: 'task-1' } }
    );

    // Fast-forward 20 seconds for task-1
    vi.advanceTimersByTime(20000);

    // Change task ID
    rerender({ taskId: 'task-2' });

    // Fast-forward 15 seconds (only 15s for task-2)
    vi.advanceTimersByTime(15000);

    // Should not have triggered for either task yet
    expect(onTimeout).not.toHaveBeenCalled();

    // Fast-forward another 15 seconds (30s for task-2)
    vi.advanceTimersByTime(15000);

    // Should trigger for task-2
    expect(onTimeout).toHaveBeenCalledWith('task-2');
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
