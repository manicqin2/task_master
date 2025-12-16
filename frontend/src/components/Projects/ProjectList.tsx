/**
 * ProjectList Component
 *
 * Displays a vertical list of tasks filtered by project with optional filtering for finished tasks.
 * Based on Figma Projects design
 *
 * @feature Projects View
 */

import { useState, useMemo } from 'react'
import { TodoTask, TodoStatus } from '@/lib/types'
import { TodoItem } from '@/components/Todos/TodoItem'
import { ProjectSelector } from './ProjectSelector'
import { cn } from '@/lib/utils'

export interface ProjectListProps {
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
 * ProjectList component - renders tasks grouped by project
 */
export function ProjectList({ tasks, onFinish, onArchive, className }: ProjectListProps) {
  const [showFinished, setShowFinished] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Extract unique projects from tasks
  const projects = useMemo(() => {
    const projectSet = new Set<string>()
    tasks.forEach((task) => {
      if (task.project) {
        projectSet.add(task.project)
      }
    })
    return Array.from(projectSet).sort()
  }, [tasks])

  // Filter tasks by project and finished status
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by project if one is selected
      if (selectedProject && task.project !== selectedProject) {
        return false
      }

      // Filter out finished tasks if toggle is off
      if (!showFinished && task.todo.status === TodoStatus.COMPLETED) {
        return false
      }

      return true
    })
  }, [tasks, selectedProject, showFinished])

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header with Project Selector and Show Finished Toggle */}
      <div className="flex items-center justify-between">
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
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
          {selectedProject
            ? `No tasks in ${selectedProject}`
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
