/**
 * PersonsView Component
 * Feature 008: Task Management UI Enhancements - User Story 3
 *
 * Displays tasks filtered by person using the unified TaskListView.
 */

import { useState, useMemo } from 'react'
import { TaskListView } from '@/components/TaskList/TaskListView'
import { TaskFilter } from '@/types/filters'

export interface PersonsViewProps {
  tasks: any[] // Should be Task[] - using any for compatibility
  onTaskClick?: (task: any) => void
  onTaskAction?: (taskId: string, action: string) => void
  className?: string
}

/**
 * PersonsView component - shows tasks filtered by person
 */
export function PersonsView({
  tasks,
  onTaskClick,
  onTaskAction,
  className = ''
}: PersonsViewProps) {
  // Extract unique persons from tasks
  const persons = useMemo(() => {
    const personSet = new Set<string>()
    tasks.forEach(task => {
      if (task.persons) {
        try {
          // Parse JSON array of persons
          const personsArray = JSON.parse(task.persons)
          personsArray.forEach((person: string) => personSet.add(person))
        } catch {
          // If parsing fails, try to extract from string
          if (typeof task.persons === 'string') {
            personSet.add(task.persons)
          }
        }
      }
    })
    return Array.from(personSet).sort()
  }, [tasks])

  const [selectedPerson, setSelectedPerson] = useState<string | undefined>(
    persons[0]
  )

  // Create filter for selected person
  const filter: TaskFilter | undefined = selectedPerson
    ? { person: selectedPerson }
    : undefined

  // Feature 008 T044: Empty state handling
  if (persons.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${className}`}>
        <div className="text-lg font-medium text-gray-700 mb-2">No persons found</div>
        <div className="text-sm text-gray-500">
          Tasks with assigned persons will appear here.
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Person selector */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Person
        </label>
        <select
          value={selectedPerson || ''}
          onChange={(e) => setSelectedPerson(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Persons</option>
          {persons.map(person => (
            <option key={person} value={person}>
              👤 {person}
            </option>
          ))}
        </select>
      </div>

      {/* Task list filtered by person */}
      <div className="flex-1 overflow-y-auto">
        <TaskListView
          tasks={tasks}
          filter={filter}
          onTaskClick={onTaskClick}
          onTaskAction={onTaskAction}
        />
      </div>
    </div>
  )
}
