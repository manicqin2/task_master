/**
 * TodoList Component
 *
 * Displays a vertical list of todos with optional filtering for finished tasks.
 * Based on Figma Todos design
 *
 * @feature Todos View
 */

import { useState } from 'react'
import { TodoTask, TodoStatus } from '@/lib/types'
import { TodoItem } from './TodoItem'
import { cn } from '@/lib/utils'

export interface TodoListProps {
  /**
   * All tasks to display as todos (tasks with todo entries)
   */
  tasks: TodoTask[]

  /**
   * Callback when Finish is clicked on a todo
   */
  onFinish: (taskId: string) => void

  /**
   * Callback when Archive is clicked on a todo
   */
  onArchive: (taskId: string) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * TodoList component - renders a list of todos
 */
export function TodoList({ tasks, onFinish, onArchive, className }: TodoListProps) {
  const [showFinished, setShowFinished] = useState(false)

  // Filter tasks: hide finished tasks unless toggle is on
  const filteredTasks = tasks.filter((task) => {
    // Filter out finished tasks if toggle is off
    if (!showFinished && task.todo.status === TodoStatus.COMPLETED) {
      return false
    }

    return true
  })

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with Show Finished Toggle */}
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-700">Show finished</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showFinished}
              onChange={(e) => setShowFinished(e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={cn(
                'w-11 h-6 rounded-full transition-colors',
                'peer-checked:bg-blue-600 bg-gray-300'
              )}
            />
            <div
              className={cn(
                'absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform',
                'peer-checked:translate-x-5'
              )}
            />
          </div>
        </label>
      </div>

      {/* Todo List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {showFinished ? 'No todos available' : 'No active todos'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TodoItem
              key={task.id}
              task={task}
              onFinish={onFinish}
              onArchive={onArchive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
