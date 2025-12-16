/**
 * LaneWorkflow Component - Task Workbench
 *
 * Container component for task creation workflow with three lanes:
 * - Pending: Tasks being enriched by LLM
 * - More Info: Tasks needing user attention (failed enrichment or missing required metadata)
 * - Ready: Tasks ready to enter the todo list (enriched with all required metadata)
 *
 * @feature 003-task-lane-workflow, 004-task-metadata-extraction
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization + Metadata Display)
 */

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { listWorkbenchTasks } from '@/services/api'
import { useLaneWorkflow } from '@/hooks/useLaneWorkflow'
import { useTaskActions } from '@/hooks/useTaskActions'
import { Lane } from './Lane'
import { LANE_CONFIGS } from '@/types/task'

export interface LaneWorkflowProps {
  /**
   * Callback when rephrase action is triggered
   */
  onRephrase?: (originalText: string) => void

  /**
   * Additional CSS classes to apply to the container
   */
  className?: string
}

/**
 * Main LaneWorkflow container component (Task Workbench)
 *
 * Fetches tasks via TanStack Query, distributes them across three lanes
 * based on enrichment status and metadata completeness, and renders each lane.
 *
 * Tasks without required metadata (e.g., project) go to More Info lane.
 */
export function LaneWorkflow({ onRephrase, className = '' }: LaneWorkflowProps) {
  // Fetch workbench tasks using existing polling mechanism from Feature 001
  const { data: tasksData } = useQuery({
    queryKey: ['workbench-tasks'],
    queryFn: listWorkbenchTasks,
    refetchInterval: 500, // Poll every 500ms
  })

  const tasks = tasksData?.tasks || []

  // Distribute tasks across lanes
  const { pendingTasks, errorTasks, finishedTasks } = useLaneWorkflow(tasks)

  // Task action handlers (Phase 4: Cancel, Phase 5: Retry, Phase 8: Confirm)
  const { handleCancel, handleRetry, handleConfirm, handleExpand, handleUpdateMetadata, handleRephrase } = useTaskActions(onRephrase)

  // Route action to appropriate handler
  const handleTaskAction = (taskId: string, action: string) => {
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
      case 'rephrase':
        handleRephrase(taskId)
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
          gridTemplateRows: 'minmax(0, 1fr)',
        }}
        role="main"
        aria-label="Task workflow board with three lanes"
      >
        {/* Pending Lane */}
        <Lane
          config={LANE_CONFIGS[0]!}
          tasks={pendingTasks}
          onTaskAction={handleTaskAction}
          onUpdateMetadata={handleUpdateMetadata}
        />

        {/* More Info Lane */}
        <Lane
          config={LANE_CONFIGS[1]!}
          tasks={errorTasks}
          onTaskAction={handleTaskAction}
          onUpdateMetadata={handleUpdateMetadata}
        />

        {/* Ready Lane */}
        <Lane
          config={LANE_CONFIGS[2]!}
          tasks={finishedTasks}
          onTaskAction={handleTaskAction}
          onUpdateMetadata={handleUpdateMetadata}
        />
      </div>
    </AnimatePresence>
  )
}
