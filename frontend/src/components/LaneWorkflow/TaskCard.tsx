/**
 * TaskCard Component
 *
 * Displays a single task within a lane. Shows task title (enriched_text or user_input),
 * status indicator, error message (if applicable), and action emblems based on lane.
 * Feature 004: Extended with metadata display (project, persons, deadline, type, priority)
 *
 * @feature 003-task-lane-workflow, 004-task-metadata-extraction
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization + Metadata Display)
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TaskWithLane, getTaskDisplayText, ACTION_EMBLEM_CONFIGS, needsTruncation } from '@/types/task'
import { ActionEmblem } from './ActionEmblem'
import { ErrorMessage } from './ErrorMessage'
import { MetadataBadges } from '../TaskCard/MetadataBadges'
import { PersonAvatars } from '../TaskCard/PersonAvatars'
import { DeadlineIndicator } from '../TaskCard/DeadlineIndicator'
import { MetadataEditor } from '../TaskCard/MetadataEditor'
import { TaskMetadata } from '@/lib/types'

/**
 * Detect user's reduced-motion preference
 */
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

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
   * Callback fired when task metadata is updated
   */
  onUpdateMetadata?: (taskId: string, metadata: any) => void

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
export const TaskCard = React.memo(function TaskCard({ task, onAction, onUpdateMetadata, className = '' }: TaskCardProps) {
  // Track updated metadata for More Info lane tasks
  const [updatedMetadata, setUpdatedMetadata] = useState<Partial<TaskMetadata> | null>(null)

  // Get display text (enriched_text if available, otherwise user_input)
  const displayText = getTaskDisplayText(task)

  // Check if text needs truncation
  const shouldTruncate = needsTruncation(displayText)

  // Build emblem list: include expand emblem if text is truncated, add move-to-ready if in More Info lane
  let emblems = [...task.emblems]

  if (shouldTruncate && !emblems.includes('expand')) {
    emblems.push('expand' as const)
  }

  // Add "move to ready" emblem if task is in More Info lane (always visible, disabled if no project)
  const hasProject = updatedMetadata?.project || task.project
  if (task.lane === 'error' && task.workbench.enrichment_status === 'completed' && !task.project) {
    emblems.push('confirm' as const)
  }

  // Add "move to todos" emblem if task is in Ready lane
  if (task.lane === 'ready') {
    emblems.push('confirm' as const)
  }

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -100 }}
      transition={{
        duration: prefersReducedMotion ? 0.01 : 0.18, // Instant for reduced-motion, <200ms otherwise (T127)
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

      {/* Error Message (if applicable) */}
      {task.workbench.error_message && <ErrorMessage message={task.workbench.error_message} />}

      {/* Metadata Display (Feature 004) */}
      {(task.project || task.persons?.length > 0 || task.deadline_parsed) && (
        <div className="mt-2 space-y-1">
          <MetadataBadges metadata={task} />
          <PersonAvatars persons={task.persons} />
          <DeadlineIndicator metadata={task} />
        </div>
      )}

      {/* Metadata Editor (More Info lane only) */}
      {task.lane === 'error' && task.workbench.enrichment_status === 'completed' && !task.project && (
        <MetadataEditor
          currentMetadata={task}
          onMetadataChange={(metadata) => setUpdatedMetadata(metadata)}
        />
      )}

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

            // For confirm emblem, customize icon and action based on lane
            const isConfirmEmblem = emblemType === 'confirm'
            const finalIcon = isConfirmEmblem ? 'ArrowRight' : customIcon

            // Determine tooltip based on lane
            let finalTooltip = customTooltip
            let isDisabled = false

            if (isConfirmEmblem) {
              if (task.lane === 'ready') {
                finalTooltip = 'Move to Todos'
              } else if (task.lane === 'error') {
                finalTooltip = hasProject ? 'Move to Ready lane' : 'Select a project first'
                isDisabled = !hasProject
              }
            }

            return (
              <ActionEmblem
                key={emblemType}
                type={emblemType}
                tooltip={finalTooltip}
                onClick={() => {
                  if (isConfirmEmblem) {
                    if (task.lane === 'ready') {
                      // Move to Todos: call confirm action
                      onAction('confirm')
                    } else if (task.lane === 'error' && hasProject && onUpdateMetadata && updatedMetadata) {
                      // Move to Ready: update task with all metadata
                      onUpdateMetadata(task.id, updatedMetadata)
                    }
                  } else {
                    onAction(emblemType)
                  }
                }}
                variant={emblemConfig.variant}
                size="sm"
                icon={finalIcon}
                disabled={isDisabled}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
})
