/**
 * PersonList Component
 *
 * Displays a vertical list of tasks filtered by person with optional filtering for finished tasks.
 * Based on Figma Persons design
 *
 * @feature Persons View
 */

import { useState, useMemo } from 'react'
import { TodoTask, TodoStatus } from '@/lib/types'
import { TodoItem } from '@/components/Todos/TodoItem'
import { PersonSelector } from './PersonSelector'
import { cn } from '@/lib/utils'

export interface PersonListProps {
  /**
   * All tasks to display (tasks with todo entries)
   */
  tasks: TodoTask[]

  /**
   * Callback when Finish is clicked on a task
   */
  onFinish: (taskId: string) => void

  /**
   * Callback when Archive is clicked on a task
   */
  onArchive: (taskId: string) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * PersonList component - renders tasks filtered by person
 */
export function PersonList({ tasks, onFinish, onArchive, className }: PersonListProps) {
  const [showFinished, setShowFinished] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)

  // Extract unique persons from tasks
  const persons = useMemo(() => {
    const personSet = new Set<string>()
    tasks.forEach((task) => {
      if (task.persons && task.persons.length > 0) {
        task.persons.forEach((person) => {
          personSet.add(person)
        })
      }
    })
    return Array.from(personSet).sort()
  }, [tasks])

  // Filter tasks by person and finished status
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by person if one is selected
      if (selectedPerson) {
        // Check if the selected person is in the task's persons array
        if (!task.persons?.includes(selectedPerson)) {
          return false
        }
      }

      // Filter out finished tasks if toggle is off
      if (!showFinished && task.todo.status === TodoStatus.COMPLETED) {
        return false
      }

      return true
    })
  }, [tasks, selectedPerson, showFinished])

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with Person Selector and Show Finished Toggle */}
      <div className="flex items-center justify-between">
        <PersonSelector
          persons={persons}
          selectedPerson={selectedPerson}
          onSelectPerson={setSelectedPerson}
          taskCount={filteredTasks.length}
        />

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

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {selectedPerson
            ? `No tasks for ${selectedPerson}`
            : showFinished
            ? 'No tasks available'
            : 'No active tasks'}
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
