/**
 * TaskCard Component
 *
 * Displays a single task within a lane. Shows task title (enriched_text or user_input),
 * status indicator, error message (if applicable), and action emblems based on lane.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import React from 'react'
import { motion } from 'framer-motion'
import { TaskWithLane, getTaskDisplayText, ACTION_EMBLEM_CONFIGS, needsTruncation } from '@/types/task'
import { ActionEmblem } from './ActionEmblem'
import { ErrorMessage } from './ErrorMessage'

export interface TaskCardProps {
  /**
   * The task to display
   */
  task: TaskWithLane

  /**
   * Callback fired when an action emblem is clicked
   */
  onAction: (action: string) => void

  /**
   * Additional CSS classes to apply to the card
   */
  className?: string
}

/**
 * TaskCard component - renders a single task in a lane
 *
 * Memoized to prevent unnecessary re-renders when parent updates
 */
export const TaskCard = React.memo(function TaskCard({ task, onAction, className = '' }: TaskCardProps) {
  // Get display text (enriched_text if available, otherwise user_input)
  const displayText = getTaskDisplayText(task)

  // Check if text needs truncation
  const shouldTruncate = needsTruncation(displayText)

  // Build emblem list: include expand emblem if text is truncated (avoid duplicates)
  const emblems = shouldTruncate && !task.emblems.includes('expand')
    ? [...task.emblems, 'expand' as const]
    : task.emblems

  // Determine status badge color based on enrichment status
  const getStatusColor = () => {
    switch (task.enrichment_status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{
        duration: 0.18, // Optimized to <200ms for cancel action
        ease: 'easeOut' // Smoother easing for better perceived performance
      }}
      className={`p-3 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
    >
      {/* Task Title */}
      <div className="mb-2">
        <p
          className={`text-sm font-medium ${
            shouldTruncate && !task.isExpanded ? 'line-clamp-2' : ''
          }`}
        >
          {displayText}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${getStatusColor()}`}
        >
          {task.enrichment_status}
        </span>
      </div>

      {/* Error Message (if applicable) */}
      {task.error_message && <ErrorMessage message={task.error_message} />}

      {/* Action Emblems */}
      {emblems.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          {emblems.map((emblemType) => {
            const emblemConfig = ACTION_EMBLEM_CONFIGS[emblemType]

            // For expand emblem, customize icon and tooltip based on expanded state
            const isExpandEmblem = emblemType === 'expand'
            const customIcon = isExpandEmblem && task.isExpanded ? 'ChevronUp' : emblemConfig.icon
            const customTooltip = isExpandEmblem && task.isExpanded
              ? 'Collapse task details'
              : emblemConfig.tooltip

            return (
              <ActionEmblem
                key={emblemType}
                type={emblemType}
                tooltip={customTooltip}
                onClick={() => onAction(emblemType)}
                variant={emblemConfig.variant}
                size="sm"
                icon={customIcon}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
})
