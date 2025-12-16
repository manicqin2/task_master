/**
 * PersonSelector Component
 *
 * Dropdown selector for filtering tasks by person.
 * Shows "All People" option and list of unique persons from tasks.
 * Displays task count for the selected person.
 * Based on Figma Persons design
 *
 * @feature Persons View
 */

import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface PersonSelectorProps {
  /**
   * List of unique persons extracted from tasks
   */
  persons: string[]

  /**
   * Currently selected person (null = "All People")
   */
  selectedPerson: string | null

  /**
   * Callback when person is selected
   */
  onSelectPerson: (person: string | null) => void

  /**
   * Number of tasks for the selected person
   */
  taskCount: number

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * PersonSelector component - renders person dropdown filter
 */
export function PersonSelector({
  persons,
  selectedPerson,
  onSelectPerson,
  taskCount,
  className,
}: PersonSelectorProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Label */}
      <label className="text-sm font-medium text-neutral-950">
        Person:
      </label>

      {/* Dropdown */}
      <div className="relative">
        <select
          value={selectedPerson || ''}
          onChange={(e) => onSelectPerson(e.target.value || null)}
          className={cn(
            'appearance-none bg-white border border-gray-300 rounded-lg',
            'px-4 py-2 pr-10',
            'text-sm text-neutral-950',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'cursor-pointer min-w-[200px]'
          )}
        >
          <option value="">All People</option>
          {persons.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </select>

        {/* Chevron Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <CaretDown size={16} weight="bold" className="text-gray-500" />
        </div>
      </div>

      {/* Task Count */}
      <div className="text-sm text-gray-600">
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </div>
    </div>
  )
}
