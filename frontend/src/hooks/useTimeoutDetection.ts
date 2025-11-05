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
 * Implementation will be added in Phase 5 (User Story 3)
 */
export function useTimeoutDetection(tasks: TaskWithLane[]) {
  const [timedOutTaskIds, setTimedOutTaskIds] = useState<Set<string>>(new Set())

  // TODO: Implement timeout detection logic in Phase 5 (T081-T083)
  // - Track last update timestamp for each pending task
  // - Check every 1 second if any task has exceeded 30s threshold
  // - Mark timed-out tasks with hasTimeout flag
  // - Move to Error lane with "Backend unavailable - retry when online" message

  useEffect(() => {
    // TODO: Implement in Phase 5
  }, [tasks])

  return {
    isTimedOut: (taskId: string) => timedOutTaskIds.has(taskId),
    timedOutTaskIds: Array.from(timedOutTaskIds),
  }
}
