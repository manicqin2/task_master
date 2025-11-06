/**
 * MetadataEditor Component
 *
 * Allows users to edit all metadata fields for tasks in the More Info lane.
 * Pre-fills with auto-detected values, allows manual editing.
 * Only project is required to move to Ready lane.
 */

import { useState, useEffect } from 'react'
import { TaskMetadata, TaskType, Priority } from '@/lib/types'

export interface MetadataEditorProps {
  /**
   * Current task metadata (may be partially filled by LLM)
   */
  currentMetadata: TaskMetadata | null

  /**
   * Callback when metadata changes
   */
  onMetadataChange: (metadata: Partial<TaskMetadata>) => void

  /**
   * Whether the task is being updated
   */
  isUpdating?: boolean
}

/**
 * Default project options
 */
const DEFAULT_PROJECTS = [
  'General',
  'Personal',
  'Work',
  'Home',
  'Health',
  'Finance',
  'Learning',
  'Social',
]

/**
 * Task type options
 */
const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: TaskType.MEETING, label: 'Meeting' },
  { value: TaskType.CALL, label: 'Call' },
  { value: TaskType.EMAIL, label: 'Email' },
  { value: TaskType.REVIEW, label: 'Review' },
  { value: TaskType.DEVELOPMENT, label: 'Development' },
  { value: TaskType.RESEARCH, label: 'Research' },
  { value: TaskType.ADMINISTRATIVE, label: 'Administrative' },
  { value: TaskType.OTHER, label: 'Other' },
]

/**
 * Priority options
 */
const PRIORITIES: { value: Priority; label: string; icon: string }[] = [
  { value: Priority.LOW, label: 'Low', icon: '' },
  { value: Priority.NORMAL, label: 'Normal', icon: '' },
  { value: Priority.HIGH, label: 'High', icon: '⚠️' },
  { value: Priority.URGENT, label: 'Urgent', icon: '🔥' },
]

/**
 * MetadataEditor component
 */
export function MetadataEditor({
  currentMetadata,
  onMetadataChange,
  isUpdating = false,
}: MetadataEditorProps) {
  const [project, setProject] = useState<string>(currentMetadata?.project || 'General')
  const [taskType, setTaskType] = useState<TaskType | null>(currentMetadata?.task_type || null)
  const [priority, setPriority] = useState<Priority | null>(currentMetadata?.priority || null)
  const [deadlineText, setDeadlineText] = useState<string>(currentMetadata?.deadline_text || '')
  const [isCustomProject, setIsCustomProject] = useState(false)

  // Pre-fill with current metadata when it changes
  useEffect(() => {
    if (currentMetadata) {
      setProject(currentMetadata.project || 'General')
      setTaskType(currentMetadata.task_type || null)
      setPriority(currentMetadata.priority || null)
      setDeadlineText(currentMetadata.deadline_text || '')
    }
  }, [currentMetadata])

  // Notify parent when metadata changes
  const handleChange = () => {
    onMetadataChange({
      project: project.trim() || null,
      task_type: taskType,
      priority: priority,
      deadline_text: deadlineText.trim() || null,
    })
  }

  const handleProjectChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomProject(true)
      setProject('')
    } else {
      setIsCustomProject(false)
      setProject(value)
      // Trigger change immediately for preset projects
      setTimeout(() => {
        onMetadataChange({
          project: value,
          task_type: taskType,
          priority: priority,
          deadline_text: deadlineText.trim() || null,
        })
      }, 0)
    }
  }

  const handleCustomProjectSubmit = () => {
    if (project.trim()) {
      setIsCustomProject(false)
      handleChange()
    }
  }

  return (
    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-3" data-testid="metadata-editor">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-yellow-800">✏️ Edit Task Details</span>
      </div>

      {/* Project Selector (Required) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          📁 Project <span className="text-red-600">*</span>
        </label>
        {!isCustomProject ? (
          <select
            value={project}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            disabled={isUpdating}
          >
            {DEFAULT_PROJECTS.map((proj) => (
              <option key={proj} value={proj}>
                {proj}
              </option>
            ))}
            <option value="__custom__">+ Custom project...</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Enter custom project name..."
              className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomProjectSubmit()
                } else if (e.key === 'Escape') {
                  setIsCustomProject(false)
                  setProject('General')
                }
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Task Type Selector (Optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          📋 Task Type
        </label>
        <select
          value={taskType || ''}
          onChange={(e) => {
            const newType = e.target.value ? (e.target.value as TaskType) : null
            setTaskType(newType)
            setTimeout(() => {
              onMetadataChange({
                project: project.trim() || null,
                task_type: newType,
                priority: priority,
                deadline_text: deadlineText.trim() || null,
              })
            }, 0)
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="">Not specified</option>
          {TASK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Selector (Optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          ⚡ Priority
        </label>
        <select
          value={priority || ''}
          onChange={(e) => {
            const newPriority = e.target.value ? (e.target.value as Priority) : null
            setPriority(newPriority)
            setTimeout(() => {
              onMetadataChange({
                project: project.trim() || null,
                task_type: taskType,
                priority: newPriority,
                deadline_text: deadlineText.trim() || null,
              })
            }, 0)
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        >
          <option value="">Not specified</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.icon} {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Deadline Input (Optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          📅 Deadline
        </label>
        <input
          type="text"
          value={deadlineText}
          onChange={(e) => setDeadlineText(e.target.value)}
          onBlur={handleChange}
          placeholder="e.g., tomorrow, next Friday, 2025-12-31"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isUpdating}
        />
        <p className="text-xs text-gray-500 mt-1">Use natural language or YYYY-MM-DD format</p>
      </div>
    </div>
  )
}
