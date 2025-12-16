/**
 * Lane Workflow Hook
 *
 * Manages the lane-based visualization of tasks.
 * Derives lane assignments from task enrichment status and provides
 * filtered task lists for each lane.
 *
 * @feature 003-task-lane-workflow
 */

import { useMemo } from 'react'
import { WorkbenchTask } from '@/lib/types'
import { TaskWithLane, Lane, enrichTaskWithLane } from '@/types/task'

/**
 * Hook for managing lane-based task workflow
 *
 * Transforms base WorkbenchTask objects to TaskWithLane by:
 * 1. Computing lane assignment from enrichment_status
 * 2. Determining available action emblems per lane
 * 3. Sorting tasks chronologically (newest first)
 * 4. Grouping tasks by lane
 */
export function useLaneWorkflow(tasks: WorkbenchTask[]) {
  // Transform tasks and distribute across lanes
  const { pendingTasks, errorTasks, finishedTasks } = useMemo(() => {
    // Enrich all tasks with lane information
    const enrichedTasks = tasks.map((task) => enrichTaskWithLane(task))

    // Sort all tasks by created_at descending (newest first)
    const sortedTasks = [...enrichedTasks].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Filter tasks into their respective lanes
    const pending = sortedTasks.filter((task) => task.lane === 'pending')
    const error = sortedTasks.filter((task) => task.lane === 'error')
    const ready = sortedTasks.filter((task) => task.lane === 'ready')

    return {
      pendingTasks: pending,
      errorTasks: error,
      finishedTasks: ready, // Keep property name for backwards compatibility
    }
  }, [tasks])

  return {
    pendingTasks,
    errorTasks,
    finishedTasks,
  }
}
