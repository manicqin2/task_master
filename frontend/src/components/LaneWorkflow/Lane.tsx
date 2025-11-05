/**
 * Lane Component
 *
 * Represents a single column in the kanban workflow (Pending, Error, or Finished).
 * Displays a header with title and task count, followed by a list of task cards.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { TaskWithLane, LaneConfig } from '@/types/task'
import { TaskCard } from './TaskCard'
import { LaneHeader } from './LaneHeader'
import { TaskCardErrorBoundary } from './TaskCardErrorBoundary'

export interface LaneProps {
  /**
   * Configuration for this lane (title, description, colors, empty message)
   */
  config: LaneConfig

  /**
   * Tasks to display in this lane (already filtered by lane)
   */
  tasks: TaskWithLane[]

  /**
   * Callback fired when an action emblem is clicked on any task in this lane
   */
  onTaskAction: (taskId: string, action: string) => void

  /**
   * Additional CSS classes to apply to the lane container
   */
  className?: string
}

/**
 * Lane component - renders a single workflow column
 *
 * Memoized to prevent unnecessary re-renders when sibling lanes update
 */
export const Lane = React.memo(function Lane({ config, tasks, onTaskAction, className = '' }: LaneProps) {
  return (
    <div
      className={`flex flex-col h-full border rounded-lg p-4 ${config.bgColor} ${config.borderColor} ${className}`}
      role="region"
      aria-label={`${config.title} lane with ${tasks.length} tasks`}
    >
      {/* Lane Header */}
      <LaneHeader
        title={config.title}
        description={config.description}
        taskCount={tasks.length}
      />

      {/* Task List or Empty State */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {config.emptyMessage}
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {tasks.map((task) => (
              <TaskCardErrorBoundary key={task.id} taskId={task.id}>
                <TaskCard
                  task={task}
                  onAction={(action) => onTaskAction(task.id, action)}
                />
              </TaskCardErrorBoundary>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
})
