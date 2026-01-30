/**
 * AgendaView Component
 * Feature 008: Task Management UI Enhancements - User Story 3
 *
 * Displays tasks filtered by deadline using the unified TaskListView.
 * Shows tasks grouped by date (today, tomorrow, this week, later).
 */

import { useState, useMemo } from 'react'
import { TaskListView } from '@/components/TaskList/TaskListView'
import { TaskFilter } from '@/types/filters'
import { Task } from '@/lib/types'

export interface AgendaViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskAction?: (taskId: string, action: string) => void
  className?: string
}

/**
 * AgendaView component - shows tasks filtered by deadline
 */
export function AgendaView({
  tasks,
  onTaskClick,
  onTaskAction,
  className = ''
}: AgendaViewProps) {
  // Extract unique deadline dates from tasks (consolidated logic)
  const deadlines = useMemo(() => {
    const dateSet = new Set<string>()
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}/

    for (const task of tasks) {
      // Prefer deadline_parsed, fallback to deadline_text
      const dateSource = task.deadline_parsed || task.deadline_text
      if (!dateSource) continue

      // Extract ISO date portion (handles both ISO dates and datetimes)
      const match = dateSource.match(isoDateRegex)
      if (match) {
        dateSet.add(match[0])
      }
    }

    return Array.from(dateSet).sort()
  }, [tasks])

  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    deadlines[0]
  )

  // Create filter for selected deadline
  const filter: TaskFilter | undefined = selectedDate
    ? { deadline: selectedDate }
    : undefined

  // Group deadlines by category for better UX
  const today = new Date().toISOString().split('T')[0] ?? ''
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] ?? ''

  const categorizedDeadlines = useMemo(() => {
    return {
      today: deadlines.filter(d => d === today),
      tomorrow: deadlines.filter(d => d === tomorrow),
      upcoming: deadlines.filter(d => d > tomorrow),
      past: deadlines.filter(d => d < today),
    }
  }, [deadlines, today, tomorrow])

  // Feature 008 T044: Empty state handling
  if (deadlines.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center ${className}`}>
        <div className="text-lg font-medium text-gray-700 mb-2">No deadlines found</div>
        <div className="text-sm text-gray-500">
          Tasks with deadlines will appear here.
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Date selector */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <select
          value={selectedDate || ''}
          onChange={(e) => setSelectedDate(e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Deadlines</option>

          {categorizedDeadlines.today.length > 0 && (
            <optgroup label="📅 Today">
              {categorizedDeadlines.today.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </optgroup>
          )}

          {categorizedDeadlines.tomorrow.length > 0 && (
            <optgroup label="➡️ Tomorrow">
              {categorizedDeadlines.tomorrow.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </optgroup>
          )}

          {categorizedDeadlines.upcoming.length > 0 && (
            <optgroup label="🔜 Upcoming">
              {categorizedDeadlines.upcoming.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </optgroup>
          )}

          {categorizedDeadlines.past.length > 0 && (
            <optgroup label="⏰ Overdue">
              {categorizedDeadlines.past.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Task list filtered by deadline */}
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
