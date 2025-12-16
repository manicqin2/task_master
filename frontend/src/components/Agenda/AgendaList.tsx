/**
 * AgendaList Component
 *
 * Calendar-based timeline view showing tasks organized by date.
 * Features a hero header, mini calendar, and timeline layout.
 *
 * @feature Agenda View
 */

import { useState, useMemo } from 'react'
import { TodoTask, TodoStatus } from '@/lib/types'
import { AgendaCalendar } from './AgendaCalendar'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface AgendaListProps {
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

interface DayGroup {
  date: Date
  dayNumber: number
  dayName: string
  tasks: TodoTask[]
}

/**
 * Parse deadline to Date
 */
function parseDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline) return null
  try {
    return new Date(deadline)
  } catch {
    return null
  }
}

/**
 * Get day name abbreviation
 */
function getDayName(date: Date): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[date.getDay()] || 'SUN'
}

/**
 * AgendaList component - renders calendar timeline view
 */
export function AgendaList({ tasks, onFinish, className }: AgendaListProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Group tasks by date
  const dayGroups = useMemo(() => {
    // Filter tasks with deadlines
    const tasksWithDeadlines = tasks.filter((task) => task.deadline_parsed)

    // Group by date
    const grouped = new Map<string, TodoTask[]>()
    tasksWithDeadlines.forEach((task) => {
      const deadline = parseDeadline(task.deadline_parsed)
      if (!deadline) return

      const dateKey = `${deadline.getFullYear()}-${deadline.getMonth()}-${deadline.getDate()}`
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)?.push(task)
    })

    // Convert to array and sort by date
    const result: DayGroup[] = []
    grouped.forEach((dayTasks) => {
      const date = dayTasks[0] ? parseDeadline(dayTasks[0].deadline_parsed) : null
      if (!date) return

      result.push({
        date,
        dayNumber: date.getDate(),
        dayName: getDayName(date),
        tasks: dayTasks.sort((a, b) => {
          // Sort by status (active first, then completed)
          if (a.todo.status === TodoStatus.COMPLETED && b.todo.status !== TodoStatus.COMPLETED)
            return 1
          if (a.todo.status !== TodoStatus.COMPLETED && b.todo.status === TodoStatus.COMPLETED)
            return -1
          return 0
        }),
      })
    })

    return result.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [tasks])

  // Get dates that have tasks (for calendar indicators)
  const datesWithTasks = useMemo(() => {
    return dayGroups.map((group) => group.date)
  }, [dayGroups])

  return (
    <div className={cn('flex flex-col h-full relative', className)}>
      {/* Hero Header */}
      <div className="relative h-48 rounded-b-3xl overflow-hidden mb-16">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop)',
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

        {/* Title */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-2xl font-medium text-white tracking-[1.27px]">YOUR AGENDA</h1>
        </div>
      </div>

      {/* Floating Calendar - positioned relative to parent container */}
      <div className="absolute left-1/2 -translate-x-1/2 top-36 z-10">
        <AgendaCalendar
          selectedDate={selectedDate}
          datesWithTasks={datesWithTasks}
          onSelectDate={setSelectedDate}
          className="w-[274px]"
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 px-6 pb-6 pt-48 overflow-y-auto">
        {dayGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No tasks scheduled</div>
        ) : (
          <div className="flex flex-col gap-6">
            {dayGroups.map((group, groupIndex) => (
              <div key={`${group.date.getTime()}`} className="flex gap-0">
                {/* Date Column */}
                <div className="w-12 flex flex-col items-center pt-1">
                  <span className="text-xl leading-7 text-neutral-950">{group.dayNumber}</span>
                  <span className="text-xs leading-4 text-gray-500 mt-px">{group.dayName}</span>
                </div>

                {/* Tasks Column */}
                <div className="flex-1 relative">
                  {/* Timeline connector */}
                  {groupIndex < dayGroups.length - 1 && (
                    <div className="absolute left-3 top-8 w-px bg-gray-200 h-[calc(100%+24px)]" />
                  )}

                  {/* Tasks */}
                  <div className="flex flex-col gap-6 ml-4">
                    {group.tasks.map((task, taskIndex) => {
                      const isCompleted = task.todo.status === TodoStatus.COMPLETED
                      const isFirstTask = taskIndex === 0

                      return (
                        <div key={task.id} className="relative">
                          {/* Timeline dot */}
                          {isFirstTask && (
                            <div
                              className={cn(
                                'absolute -left-[28px] top-1 w-6 h-6 rounded-full',
                                isCompleted ? 'bg-[#00c950]' : 'bg-[#00b8db]'
                              )}
                            />
                          )}

                          {/* Task Card */}
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-4 ml-9">
                            <div className="flex-1">
                              <p
                                className={cn(
                                  'text-base leading-6 text-neutral-950',
                                  isCompleted && 'line-through opacity-60'
                                )}
                              >
                                {task.enriched_text || task.user_input}
                              </p>
                              {task.project && (
                                <p className="text-sm leading-5 text-gray-500 mt-1">
                                  {task.project}
                                </p>
                              )}
                            </div>

                            {/* Checkbox */}
                            <button
                              onClick={() => onFinish(task.id)}
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-1',
                                isCompleted
                                  ? 'bg-neutral-950 border-neutral-950'
                                  : 'bg-gray-50 border-gray-300 hover:border-neutral-950'
                              )}
                            >
                              {isCompleted && <Check size={14} weight="bold" className="text-white" />}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
