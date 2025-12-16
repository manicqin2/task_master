/**
 * TodoItem Component
 *
 * Displays a single todo item with task text, metadata badges, person avatars,
 * and action buttons (Finish, Archive).
 * Based on Figma Todos design
 *
 * @feature Todos View
 */

import { CheckCircle2, Archive } from 'lucide-react'
import { Task } from '@/lib/types'
import { MetadataBadges } from '@/components/TaskCard/MetadataBadges'
import { PersonAvatars } from '@/components/TaskCard/PersonAvatars'
import { DeadlineIndicator } from '@/components/TaskCard/DeadlineIndicator'
import { cn } from '@/lib/utils'

export interface TodoItemProps {
  /**
   * The task/todo to display
   */
  task: Task

  /**
   * Callback when Finish is clicked
   */
  onFinish: (taskId: string) => void

  /**
   * Callback when Archive is clicked
   */
  onArchive: (taskId: string) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * TodoItem component - renders a single todo in the list
 */
export function TodoItem({ task, onFinish, onArchive, className }: TodoItemProps) {
  const displayText = task.enriched_text || task.user_input

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-6',
        'flex flex-col gap-4',
        className
      )}
    >
      {/* Task Text */}
      <p className="text-base leading-6 text-neutral-950">
        {displayText}
      </p>

      {/* Metadata Section */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Metadata Badges */}
        {(task.project || task.task_type || task.priority) && (
          <MetadataBadges metadata={task} />
        )}
        {task.deadline_parsed && (
          <DeadlineIndicator metadata={task} />
        )}
        {task.persons && task.persons.length > 0 && (
          <PersonAvatars persons={task.persons} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => onFinish(task.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium text-green-600',
            'hover:bg-green-50 transition-colors'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Done</span>
        </button>

        <button
          onClick={() => onArchive(task.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium text-gray-600',
            'hover:bg-gray-100 transition-colors'
          )}
        >
          <Archive className="w-4 h-4" />
          <span>Archive</span>
        </button>
      </div>
    </div>
  )
}
