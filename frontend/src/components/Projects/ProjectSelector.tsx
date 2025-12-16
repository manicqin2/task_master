/**
 * ProjectSelector Component
 *
 * Dropdown selector for filtering tasks by project.
 * Shows "All Projects" option and list of unique projects from tasks.
 * Displays task count for the selected project.
 * Based on Figma Projects design
 *
 * @feature Projects View
 */

import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface ProjectSelectorProps {
  /**
   * List of unique projects extracted from tasks
   */
  projects: string[]

  /**
   * Currently selected project (null = "All Projects")
   */
  selectedProject: string | null

  /**
   * Callback when project is selected
   */
  onSelectProject: (project: string | null) => void

  /**
   * Number of tasks for the selected project
   */
  taskCount: number

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * ProjectSelector component - renders project dropdown filter
 */
export function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
  taskCount,
  className,
}: ProjectSelectorProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Label */}
      <label className="text-sm font-medium text-neutral-950">
        Project:
      </label>

      {/* Dropdown */}
      <div className="relative">
        <select
          value={selectedProject || ''}
          onChange={(e) => onSelectProject(e.target.value || null)}
          className={cn(
            'appearance-none bg-white border border-gray-300 rounded-lg',
            'px-4 py-2 pr-10',
            'text-sm text-neutral-950',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'cursor-pointer min-w-[200px]'
          )}
        >
          <option value="">All Projects</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
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
