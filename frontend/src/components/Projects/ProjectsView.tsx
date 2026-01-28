/**
 * ProjectsView Component
 * Feature 008: Task Management UI Enhancements - User Story 3
 *
 * Displays tasks filtered by project using the unified TaskListView.
 */

import { useState, useMemo } from 'react'
import { TaskListView } from '@/components/TaskList/TaskListView'
import { TaskFilter } from '@/types/filters'
import { Task } from '@/lib/types'

export interface ProjectsViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskAction?: (taskId: string, action: string) => void
  className?: string
}

/**
 * ProjectsView component - shows tasks grouped by project
 */
export function ProjectsView({
  tasks,
  onTaskClick,
  onTaskAction,
  className = ''
}: ProjectsViewProps) {
  // Extract unique projects from tasks
  const projects = useMemo(() => {
    const projectSet = new Set<string>()
    tasks.forEach(task => {
      if (task.project) {
        projectSet.add(task.project)
      }
    })
    return Array.from(projectSet).sort()
  }, [tasks])

  const [selectedProject, setSelectedProject] = useState<string | undefined>(
    projects[0]
  )

  // Create filter for selected project
  const filter: TaskFilter | undefined = selectedProject
    ? { project: selectedProject }
    : undefined

  // Feature 008 T044: Empty state handling
  if (projects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${className}`}>
        <div className="text-lg font-medium text-gray-700 mb-2">No projects found</div>
        <div className="text-sm text-gray-500">
          Tasks with assigned projects will appear here.
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Project selector */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject || ''}
          onChange={(e) => setSelectedProject(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project} value={project}>
              📁 {project}
            </option>
          ))}
        </select>
      </div>

      {/* Task list filtered by project */}
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
