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
import { Task } from '@/lib/types'

/**
 * Filter and sort tasks based on provided criteria
 *
 * Note: Task.persons is typed as string[] in the Task interface, but may come
 * from the API as a JSON string. This hook handles both cases for robustness.
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

        // Handle both string[] (parsed) and string (raw JSON from API) formats
        const personsArray = Array.isArray(task.persons)
          ? task.persons
          : (() => {
              try {
                return JSON.parse(task.persons as unknown as string)
              } catch (e) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Failed to parse persons JSON for task ${task.id}:`, e)
                }
                return []
              }
            })()

        return personsArray.includes(filter.person)
      })
    }

    // Sort by priority first, then by deadline
    return sortTasksByPriorityAndDeadline(filtered)
  }, [tasks, filter])
}
