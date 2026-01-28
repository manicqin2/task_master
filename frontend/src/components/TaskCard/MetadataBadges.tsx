/**
 * MetadataBadges Component
 *
 * Displays metadata badges for project, task type, and priority.
 * Feature 004: Task Metadata Extraction - Phase 3 User Story 1
 */

import { TaskMetadata, TaskType, Priority } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

export interface MetadataBadgesProps {
  metadata: TaskMetadata
}

/**
 * Get color scheme for task type badge
 */
function getTaskTypeColor(taskType: TaskType): string {
  switch (taskType) {
    case TaskType.MEETING:
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
    case TaskType.CALL:
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    case TaskType.EMAIL:
      return 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
    case TaskType.REVIEW:
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    case TaskType.DEVELOPMENT:
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    case TaskType.RESEARCH:
      return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
    case TaskType.ADMINISTRATIVE:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    case TaskType.OTHER:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-200'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }
}

/**
 * Get color scheme for priority badge
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case Priority.URGENT:
      return 'bg-red-100 text-red-800 hover:bg-red-200'
    case Priority.HIGH:
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
    case Priority.NORMAL:
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    case Priority.LOW:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }
}

/**
 * Format task type for display
 */
function formatTaskType(taskType: TaskType): string {
  return taskType.charAt(0).toUpperCase() + taskType.slice(1).toLowerCase()
}

/**
 * Format priority for display
 */
function formatPriority(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
}

/**
 * MetadataBadges component
 */
export function MetadataBadges({ metadata }: MetadataBadgesProps) {
  const { project, task_type, priority } = metadata

  // Feature 008 T042: Backward compatibility - null priority defaults to "Low"
  const displayPriority = priority || Priority.LOW

  // Don't render anything if no metadata to display
  if (!project && !task_type && !priority) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="metadata-badges">
      {project && (
        <Badge
          variant="outline"
          className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
          data-testid="project-badge"
        >
          📁 {project}
        </Badge>
      )}

      {task_type && (
        <Badge
          variant="outline"
          className={getTaskTypeColor(task_type)}
          data-testid="task-type-badge"
        >
          {formatTaskType(task_type)}
        </Badge>
      )}

      <Badge
        variant="outline"
        className={getPriorityColor(displayPriority)}
        data-testid="priority-badge"
      >
        {displayPriority === Priority.URGENT && '🔥 '}
        {displayPriority === Priority.HIGH && '⚠️ '}
        {formatPriority(displayPriority)}
      </Badge>
    </div>
  )
}
