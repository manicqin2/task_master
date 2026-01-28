/**
 * useFilteredTasks Hook
 * Feature 008: Task Management UI Enhancements - User Story 3
 *
 * Custom hook for filtering and sorting tasks based on different criteria.
 * Enables unified task views across Projects, Agenda, Persons, and Todos tabs.
 */

import { useMemo } from 'react'
import { TaskFilter } from '@/types/filters'
import { sortTasksByPriorityAndDeadline } from '@/lib/taskSorting'

// Placeholder for task type - should match your actual Task type
interface Task {
  id: string
  user_input: string
  enriched_text?: string | null
  project?: string | null
  deadline_text?: string | null
  deadline_parsed?: string | null
  persons?: string | null // JSON array as string
  priority?: string | null
  task_type?: string | null
  created_at: string
  updated_at: string
  [key: string]: any
}

/**
 * Filter and sort tasks based on provided criteria
 *
 * @param tasks - Array of tasks to filter
 * @param filter - Filter criteria (project, deadline, person)
 * @returns Filtered and sorted tasks
 */
export function useFilteredTasks(tasks: Task[], filter?: TaskFilter): Task[] {
  return useMemo(() => {
    let filtered = tasks

    // Apply project filter
    if (filter?.project) {
      filtered = filtered.filter(task => task.project === filter.project)
    }

    // Apply deadline filter (exact date match)
    if (filter?.deadline) {
      filtered = filtered.filter(task => {
        // Match by deadline_text (ISO format) or deadline_parsed
        return (
          task.deadline_text === filter.deadline ||
          task.deadline_parsed?.split('T')[0] === filter.deadline
        )
      })
    }

    // Apply person filter
    if (filter?.person) {
      filtered = filtered.filter(task => {
        if (!task.persons) return false

        try {
          // Parse JSON array of persons
          const personsArray = JSON.parse(task.persons)
          return personsArray.includes(filter.person)
        } catch {
          // If parsing fails, check if person is in the string
          return task.persons.includes(filter.person)
        }
      })
    }

    // Sort by priority first, then by deadline
    return sortTasksByPriorityAndDeadline(filtered)
  }, [tasks, filter])
}
