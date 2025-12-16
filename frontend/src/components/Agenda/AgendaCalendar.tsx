/**
 * AgendaCalendar Component
 *
 * Mini calendar widget for the Agenda view showing current month
 * with indicators for days that have tasks.
 *
 * @feature Agenda View
 */

import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface AgendaCalendarProps {
  /**
   * Currently selected date
   */
  selectedDate: Date

  /**
   * Dates that have tasks (for showing indicators)
   */
  datesWithTasks: Date[]

  /**
   * Callback when date is selected
   */
  onSelectDate?: (date: Date) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * Get days in month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Get first day of month (0 = Sunday)
 */
function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if date has tasks
 */
function hasTask(date: Date, datesWithTasks: Date[]): boolean {
  return datesWithTasks.some((d) => isSameDay(d, date))
}

/**
 * AgendaCalendar component
 */
export function AgendaCalendar({
  selectedDate,
  datesWithTasks,
  onSelectDate,
  className,
}: AgendaCalendarProps) {
  const daysInMonth = getDaysInMonth(selectedDate)
  const firstDay = getFirstDayOfMonth(selectedDate)

  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  // Generate calendar days (including empty cells for padding)
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onSelectDate?.(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onSelectDate?.(newDate)
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
    onSelectDate?.(newDate)
  }

  return (
    <div
      className={cn(
        'bg-white rounded-3xl shadow-lg p-5 flex flex-col gap-4',
        className
      )}
    >
      {/* Header with month/year and navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <span className="text-sm font-normal text-[#f6339a] tracking-tight">
          {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </span>

        <button
          onClick={goToNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day, index) => (
          <div key={index} className="flex items-center justify-center h-4">
            <span className="text-xs text-gray-500">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-[30px]" />
          }

          const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day)
          const isSelected = isSameDay(dayDate, selectedDate)
          const hasTasks = hasTask(dayDate, datesWithTasks)
          const isPastMonth = dayDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={cn(
                'h-[30px] rounded-lg flex flex-col items-center justify-center gap-0.5',
                'hover:bg-gray-100 transition-colors',
                isSelected && 'bg-[#00b8db]',
                isPastMonth && 'opacity-40'
              )}
            >
              <span
                className={cn(
                  'text-xs leading-4',
                  isSelected ? 'text-white' : 'text-neutral-950',
                  isPastMonth && 'text-gray-400'
                )}
              >
                {day}
              </span>
              {hasTasks && (
                <span
                  className={cn(
                    'text-[9px] leading-3 tracking-wider',
                    isSelected ? 'text-white' : 'text-[#00b8db]'
                  )}
                >
                  1
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
