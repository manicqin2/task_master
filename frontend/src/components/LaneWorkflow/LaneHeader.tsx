/**
 * LaneHeader Component
 *
 * Header section for each lane showing title only.
 * Updated to match Figma design at node-id=1:5
 *
 * The header is rendered separately from the lane container to allow for
 * rounded corners at the top with colored background.
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
   * Optional description text (no longer displayed in new design)
   */
  description?: string

  /**
   * Number of tasks in this lane (no longer displayed in new design)
   */
  taskCount?: number
}

/**
 * LaneHeader component - renders lane title only (simplified design)
 */
export const LaneHeader: React.FC<LaneHeaderProps> = React.memo(
  ({ title }) => {
    return (
      <div className="px-4 py-4">
        <h2 className="text-base font-normal leading-6 tracking-tight text-neutral-950">
          {title}
        </h2>
      </div>
    )
  }
)

LaneHeader.displayName = 'LaneHeader'
