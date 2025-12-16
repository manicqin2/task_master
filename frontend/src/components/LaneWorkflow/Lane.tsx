/**
 * Lane Component
 *
 * Represents a single column in the kanban workflow (Pending, Error, or Finished).
 * Displays a header with colored background, followed by a white card area with task list.
 * Updated to match Figma design at node-id=1:5
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
import { cn } from '@/lib/utils'

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
   * Callback fired when task metadata is updated
   */
  onUpdateMetadata?: (taskId: string, metadata: any) => void

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
export const Lane = React.memo(function Lane({ config, tasks, onTaskAction, onUpdateMetadata, className = '' }: LaneProps) {
  return (
    <div
      className={cn('flex flex-col h-full min-w-0', className)}
      role="region"
      aria-label={`${config.title} lane with ${tasks.length} tasks`}
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Lane Header with colored background */}
      <div
        className={cn(
          'border rounded-t-lg',
          config.bgColor,
          config.borderColor
        )}
      >
        <LaneHeader
          title={config.title}
          description={config.description}
          taskCount={tasks.length}
        />
      </div>

      {/* Task List Container with white background */}
      <div
        className={cn(
          'flex-1 bg-white border-l border-r border-b border-gray-300',
          'rounded-b-lg overflow-y-auto overflow-x-hidden',
          'px-4 pt-4 pb-1 min-h-0'
        )}
      >
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {config.emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {tasks.map((task) => (
                <TaskCardErrorBoundary key={task.id} taskId={task.id}>
                  <TaskCard
                    task={task}
                    onAction={(action) => onTaskAction(task.id, action)}
                    onUpdateMetadata={onUpdateMetadata}
                  />
                </TaskCardErrorBoundary>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
})
