/**
 * DeadlineIndicator Component
 *
 * Displays deadline information with visual urgency indicators.
 * Feature 004: Task Metadata Extraction - Phase 3 User Story 1
 */

import { TaskMetadata } from '@/lib/types'

export interface DeadlineIndicatorProps {
  metadata: TaskMetadata
}

/**
 * Format deadline for display
 */
function formatDeadline(deadlineParsed: string): string {
  const date = new Date(deadlineParsed)
  const now = new Date()

  // Calculate difference in days
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Today
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  // Tomorrow
  if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  // Within a week
  if (diffDays > 0 && diffDays <= 7) {
    return `${date.toLocaleDateString('en-US', { weekday: 'short' })} at ${date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    )}`
  }

  // More than a week
  if (diffDays > 7) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Past deadline
  return `Overdue: ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}

/**
 * Get urgency color based on deadline proximity
 */
function getUrgencyColor(deadlineParsed: string): string {
  const date = new Date(deadlineParsed)
  const now = new Date()

  // Calculate difference in hours
  const diffTime = date.getTime() - now.getTime()
  const diffHours = diffTime / (1000 * 60 * 60)

  // Past deadline
  if (diffHours < 0) {
    return 'bg-red-100 text-red-800 border-red-300'
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return 'bg-orange-100 text-orange-800 border-orange-300'
  }

  // 1-3 days
  if (diffHours < 72) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }

  // More than 3 days
  return 'bg-blue-100 text-blue-800 border-blue-300'
}

/**
 * Get urgency icon
 */
function getUrgencyIcon(deadlineParsed: string): string {
  const date = new Date(deadlineParsed)
  const now = new Date()

  const diffTime = date.getTime() - now.getTime()
  const diffHours = diffTime / (1000 * 60 * 60)

  if (diffHours < 0) {
    return '🚨' // Overdue
  }

  if (diffHours < 24) {
    return '⏰' // Urgent
  }

  if (diffHours < 72) {
    return '⏳' // Soon
  }

  return '📅' // Scheduled
}

/**
 * DeadlineIndicator component
 */
export function DeadlineIndicator({ metadata }: DeadlineIndicatorProps) {
  const { deadline_text, deadline_parsed } = metadata

  // Don't render if no deadline
  if (!deadline_parsed) {
    return null
  }

  const displayText = deadline_text || formatDeadline(deadline_parsed)
  const urgencyColor = getUrgencyColor(deadline_parsed)
  const icon = getUrgencyIcon(deadline_parsed)

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 mt-2 rounded-md
        text-xs font-medium border
        ${urgencyColor}
      `}
      data-testid="deadline-indicator"
      title={`Deadline: ${new Date(deadline_parsed).toLocaleString()}`}
    >
      <span>{icon}</span>
      <span>{displayText}</span>
    </div>
  )
}
