/**
 * MetadataEditor Component
 *
 * Allows users to edit all metadata fields for tasks in the More Info lane.
 * Pre-fills with auto-detected values, allows manual editing.
 * Only project is required to move to Ready lane.
 */

import { useState, useEffect } from 'react'
import { TaskMetadata } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
const TASK_TYPES: { value: string; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'review', label: 'Review' },
  { value: 'development', label: 'Development' },
  { value: 'research', label: 'Research' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
]

/**
 * Priority options
 */
const PRIORITIES: { value: string; label: string; icon: string }[] = [
  { value: 'low', label: 'Low', icon: '' },
  { value: 'normal', label: 'Normal', icon: '' },
  { value: 'high', label: 'High', icon: '⚠️' },
  { value: 'urgent', label: 'Urgent', icon: '🔥' },
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
  const [taskType, setTaskType] = useState<string | null>(currentMetadata?.task_type || null)
  const [priority, setPriority] = useState<string | null>(currentMetadata?.priority || null)
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
          <Select
            value={project}
            onValueChange={handleProjectChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full border-yellow-300 focus:ring-yellow-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PROJECTS.map((proj) => (
                <SelectItem key={proj} value={proj}>
                  {proj}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">+ Custom project...</SelectItem>
            </SelectContent>
          </Select>
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
        <Select
          value={taskType || 'none'}
          onValueChange={(newType) => {
            const finalType = newType === 'none' ? null : newType
            setTaskType(finalType)
            setTimeout(() => {
              onMetadataChange({
                project: project.trim() || null,
                task_type: finalType,
                priority: priority,
                deadline_text: deadlineText.trim() || null,
              })
            }, 0)
          }}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {TASK_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority Selector (Optional) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          ⚡ Priority
        </label>
        <Select
          value={priority || 'none'}
          onValueChange={(newPriority) => {
            const finalPriority = newPriority === 'none' ? null : newPriority
            setPriority(finalPriority)
            setTimeout(() => {
              onMetadataChange({
                project: project.trim() || null,
                task_type: taskType,
                priority: finalPriority,
                deadline_text: deadlineText.trim() || null,
              })
            }, 0)
          }}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.icon} {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
