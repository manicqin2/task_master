/**
 * ProjectSelector Component
 *
 * Allows users to select a project for tasks in the More Info lane.
 * Shows dropdown with known projects and allows moving task to Ready lane.
 */

import { useState } from 'react'

export interface ProjectSelectorProps {
  /**
   * Currently selected project (if any)
   */
  currentProject: string | null

  /**
   * Callback when project is selected from dropdown
   */
  onProjectChange: (project: string) => void

  /**
   * Whether the task is being updated
   */
  isUpdating?: boolean
}

/**
 * Default project options
 */
const DEFAULT_PROJECTS = [
  'Personal',
  'Work',
  'General',
  'Home',
  'Health',
  'Finance',
  'Learning',
  'Social',
]

/**
 * ProjectSelector component
 */
export function ProjectSelector({
  currentProject,
  onProjectChange,
  isUpdating = false,
}: ProjectSelectorProps) {
  const [selectedProject, setSelectedProject] = useState<string>(currentProject || '')
  const [isCustom, setIsCustom] = useState(false)

  const handleProjectChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustom(true)
      setSelectedProject('')
    } else {
      setIsCustom(false)
      setSelectedProject(value)
      onProjectChange(value) // Notify parent of selection
    }
  }

  const handleCustomSubmit = () => {
    if (selectedProject.trim()) {
      setIsCustom(false)
      onProjectChange(selectedProject.trim()) // Notify parent of custom project
    }
  }

  return (
    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md" data-testid="project-selector">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-yellow-800">📁 Project Required</span>
      </div>

      {!isCustom ? (
        <div className="flex flex-col gap-2">
          <select
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            disabled={isUpdating}
          >
            <option value="">Select a project...</option>
            {DEFAULT_PROJECTS.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
            <option value="__custom__">+ Custom project...</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            placeholder="Enter custom project name..."
            className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomSubmit()
              } else if (e.key === 'Escape') {
                setIsCustom(false)
                setSelectedProject(currentProject || '')
              }
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
