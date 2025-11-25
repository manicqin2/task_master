/**
 * LaneHeader Component
 *
 * Header section for each lane showing title, description, and task count.
 * Extracted from Lane component for better separation of concerns.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - REFACTOR (Optimize and Extract)
 */

import React from 'react'

export interface LaneHeaderProps {
  /**
   * Lane title to display
   */
  title: string

  /**
   * Optional description text
   */
  description?: string

  /**
   * Number of tasks in this lane
   */
  taskCount: number
}

/**
 * LaneHeader component - renders lane title, description, and count
 */
export const LaneHeader: React.FC<LaneHeaderProps> = React.memo(
  ({ title, description, taskCount }) => {
    return (
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </div>
      </div>
    )
  }
)

LaneHeader.displayName = 'LaneHeader'
