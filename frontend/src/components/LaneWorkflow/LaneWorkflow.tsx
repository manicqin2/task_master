/**
 * LaneWorkflow Component
 *
 * Container component that renders three lanes (Pending, Error, Finished)
 * using CSS Grid layout. Manages task distribution across lanes based on
 * enrichment status.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { listTasks } from '@/services/api'
import { useLaneWorkflow } from '@/hooks/useLaneWorkflow'
import { useTaskActions } from '@/hooks/useTaskActions'
import { Lane } from './Lane'
import { LANE_CONFIGS, ActionEmblem } from '@/types/task'

export interface LaneWorkflowProps {
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string
}

/**
 * Main LaneWorkflow container component
 *
 * Fetches tasks via TanStack Query, distributes them across three lanes,
 * and renders each lane with its respective tasks.
 */
export function LaneWorkflow({ className = '' }: LaneWorkflowProps) {
  // Fetch tasks using existing polling mechanism from Feature 001
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
    refetchInterval: 500, // Poll every 500ms
  })

  const tasks = tasksData?.tasks || []

  // Distribute tasks across lanes
  const { pendingTasks, errorTasks, finishedTasks } = useLaneWorkflow(tasks)

  // Task action handlers (Phase 4: Cancel, Phase 5: Retry, Phase 8: Confirm)
  const { handleCancel, handleRetry, handleConfirm, handleExpand } = useTaskActions()

  // Route action to appropriate handler
  const handleTaskAction = (taskId: string, action: ActionEmblem) => {
    switch (action) {
      case 'cancel':
        handleCancel(taskId)
        break
      case 'retry':
        handleRetry(taskId)
        break
      case 'confirm':
        handleConfirm(taskId)
        break
      case 'expand':
        handleExpand(taskId)
        break
      default:
        console.warn(`Unknown action: ${action}`)
    }
  }

  return (
    <AnimatePresence>
      <div
        className={`grid grid-cols-3 gap-4 h-full w-full ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
        role="main"
        aria-label="Task workflow board with three lanes"
      >
        {/* Pending Lane */}
        <Lane
          config={LANE_CONFIGS[0]} // Pending lane config
          tasks={pendingTasks}
          onTaskAction={handleTaskAction}
        />

        {/* Error / More Info Lane */}
        <Lane
          config={LANE_CONFIGS[1]} // Error lane config
          tasks={errorTasks}
          onTaskAction={handleTaskAction}
        />

        {/* Finished Lane */}
        <Lane
          config={LANE_CONFIGS[2]} // Finished lane config
          tasks={finishedTasks}
          onTaskAction={handleTaskAction}
        />
      </div>
    </AnimatePresence>
  )
}
