/**
 * Timeout Detection Hook
 *
 * Monitors tasks in the Pending lane and detects when they've been
 * stuck for >30 seconds without status updates. Automatically moves
 * timed-out tasks to the Error lane with a helpful message.
 *
 * Uses a separate 1-second interval for accuracy (independent of
 * the 500ms task polling interval).
 *
 * @feature 003-task-lane-workflow
 */

import { useEffect, useState } from 'react'
import { Task } from '@/lib/types'
import { TaskWithLane } from '@/types/task'

/**
 * Timeout threshold in milliseconds
 */
const TIMEOUT_THRESHOLD_MS = 30000 // 30 seconds

/**
 * Hook for detecting timed-out tasks
 *
 * Monitors tasks and triggers timeout callback after 30 seconds
 */
export function useTimeoutDetection(
  taskId: string,
  status: 'pending' | 'processing' | 'failed' | 'completed' | 'error' | 'finished',
  onTimeout: (taskId: string) => void
) {
  useEffect(() => {
    // Only monitor pending/processing tasks
    if (status !== 'pending' && status !== 'processing') {
      return
    }

    // Set timeout for 30 seconds
    const timeoutId = setTimeout(() => {
      onTimeout(taskId)
    }, TIMEOUT_THRESHOLD_MS)

    // Cleanup timeout on unmount or status change
    return () => {
      clearTimeout(timeoutId)
    }
  }, [taskId, status, onTimeout])
}
