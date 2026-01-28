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

// Extended Task type for filtering (persons stored as string in DB)
interface FilterableTask extends Omit<Task, 'persons'> {
  persons?: string | null // JSON array as string from DB
}

/**
 * Filter and sort tasks based on provided criteria
 *
 * @param tasks - Array of tasks to filter
 * @param filter - Filter criteria (project, deadline, person)
 * @returns Filtered and sorted tasks
 */
export function useFilteredTasks(tasks: FilterableTask[], filter?: TaskFilter): FilterableTask[] {
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
        } catch (e) {
          // If parsing fails, log in development and fallback to string inclusion
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to parse persons JSON for task ${task.id}:`, e)
          }
          return task.persons.includes(filter.person)
        }
      })
    }

    // Sort by priority first, then by deadline
    return sortTasksByPriorityAndDeadline(filtered)
  }, [tasks, filter])
}
