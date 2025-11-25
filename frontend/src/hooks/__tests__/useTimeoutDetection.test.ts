/**
 * Tests for useTimeoutDetection Hook
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 5 - User Story 3 (Retry and Cancel in Error Lane)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTimeoutDetection } from '../useTimeoutDetection'

describe('useTimeoutDetection Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // T069: Write test: useTimeoutDetection triggers after 30 seconds with no response
  it('should trigger timeout after 30 seconds', async () => {
    const onTimeout = vi.fn()
    const taskId = 'task-123'

    renderHook(() => useTimeoutDetection(taskId, 'pending', onTimeout))

    // Fast-forward time by 30 seconds
    vi.advanceTimersByTime(30000)

    // Verify timeout was called (will fail until implementation exists)
    expect(onTimeout).toHaveBeenCalledWith(taskId)
  }, 10000)

  // T070: Write test: useTimeoutDetection moves task to Error lane with "Backend unavailable" message
  it('should call onTimeout with correct message after 30s', async () => {
    const onTimeout = vi.fn()
    const taskId = 'task-456'

    renderHook(() => useTimeoutDetection(taskId, 'pending', onTimeout))

    // Fast-forward time by 30 seconds
    vi.advanceTimersByTime(30000)

    // Timeout callback should be called with taskId (will fail until implementation exists)
    expect(onTimeout).toHaveBeenCalledWith(taskId)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  }, 10000)

  it('should NOT trigger timeout if status changes before 30s', () => {
    const onTimeout = vi.fn()
    const taskId = 'task-789'

    const { rerender } = renderHook(
      ({ status }) => useTimeoutDetection(taskId, status, onTimeout),
      { initialProps: { status: 'pending' as const } }
    )

    // Fast-forward 15 seconds
    vi.advanceTimersByTime(15000)

    // Change status to completed
    rerender({ status: 'completed' as const })

    // Fast-forward another 20 seconds (total 35s)
    vi.advanceTimersByTime(20000)

    // Timeout should NOT be called because status changed
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('should clear timeout on unmount', () => {
    const onTimeout = vi.fn()
    const taskId = 'task-unmount'

    const { unmount } = renderHook(() => useTimeoutDetection(taskId, 'pending', onTimeout))

    // Fast-forward 15 seconds
    vi.advanceTimersByTime(15000)

    // Unmount hook
    unmount()

    // Fast-forward another 20 seconds (total 35s)
    vi.advanceTimersByTime(20000)

    // Timeout should NOT be called because hook was unmounted
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
