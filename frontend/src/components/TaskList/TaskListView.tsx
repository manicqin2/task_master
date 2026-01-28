/**
 * TaskListView Component
 * Feature 008: Task Management UI Enhancements - User Story 3
 *
 * Unified task list component used across all tabs (Todos, Projects, Agenda, Persons).
 * Accepts a filter prop to show different subsets of tasks with consistent UI.
 */

import { TaskFilter } from '@/types/filters'
import { useFilteredTasks } from '@/hooks/useFilteredTasks'
import { Task } from '@/lib/types'

export interface TaskListViewProps {
  /** Array of all tasks */
  tasks: Task[]

  /** Optional filter to apply */
  filter?: TaskFilter

  /** Whether tasks are currently loading */
  isLoading?: boolean

  /** Callback when a task is clicked */
  onTaskClick?: (task: Task) => void

  /** Callback when a task action is triggered (complete, delete, etc.) */
  onTaskAction?: (taskId: string, action: string) => void
}

/**
 * TaskListView - Reusable task list with filtering
 */
export function TaskListView({
  tasks,
  filter,
  isLoading = false,
  onTaskClick,
  onTaskAction,
}: TaskListViewProps) {
  // Apply filtering and sorting
  const filteredTasks = useFilteredTasks(tasks, filter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-lg font-medium text-gray-700 mb-2">No tasks found</div>
        <div className="text-sm text-gray-500">
          {filter
            ? 'No tasks match the current filter criteria.'
            : 'Create a task to get started.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filteredTasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onClick={() => onTaskClick?.(task)}
          onAction={(action) => onTaskAction?.(task.id, action)}
        />
      ))}
    </div>
  )
}

/**
 * TaskItem - Individual task card
 */
function TaskItem({
  task,
  onClick,
  onAction,
}: {
  task: Task
  onClick?: () => void
  onAction?: (action: string) => void
}) {
  const displayText = task.enriched_text || task.user_input

  // Priority badge color
  const priorityColors = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    normal: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-800',
  }

  const priorityColor = priorityColors[task.priority?.toLowerCase() as keyof typeof priorityColors] || priorityColors.low

  return (
    <div
      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 mb-1">{displayText}</div>

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {task.project && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                📁 {task.project}
              </span>
            )}

            <span className={`px-2 py-1 rounded ${priorityColor}`}>
              {task.priority || 'Low'}
            </span>

            {task.deadline_text && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                📅 {task.deadline_text}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAction?.('complete')
            }}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Mark as complete"
          >
            ✓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAction?.('delete')
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
