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
 * Parse persons field which may be string[] or JSON string from API.
 * Task.persons is typed as string[] but API may return JSON string.
 *
 * @param persons - The persons field value (string[] or JSON string)
 * @param taskId - Task ID for debug logging
 * @returns Parsed array of person names
 */
function parsePersons(persons: unknown, taskId?: string): string[] {
  if (Array.isArray(persons)) {
    return persons
  }
  if (typeof persons === 'string') {
    try {
      const parsed = JSON.parse(persons)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Failed to parse persons JSON for task ${taskId}:`, e)
      }
      return []
    }
  }
  return []
}

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
        const personsArray = parsePersons(task.persons, task.id)
        return personsArray.includes(filter.person)
      })
    }

    // Sort by priority first, then by deadline
    return sortTasksByPriorityAndDeadline(filtered)
  }, [tasks, filter])
}
