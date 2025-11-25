/**
 * Component Props Contracts for Lane Workflow Feature
 *
 * Defines TypeScript prop interfaces for all React components in the LaneWorkflow library.
 * These contracts ensure type safety and serve as documentation for component APIs.
 *
 * @module lane-workflow-props
 * @feature 003-task-lane-workflow
 */

import { TaskWithLane, ActionEmblem, Lane, LaneConfig } from './task-with-lane-interface'

/**
 * Props for the LaneWorkflow container component
 *
 * This is the top-level component that renders the three-lane kanban board.
 *
 * @example
 * ```tsx
 * <LaneWorkflow
 *   className="h-full"
 *   onTaskAction={(taskId, action) => console.log(`Action ${action} on task ${taskId}`)}
 *   emptyStateComponent={<CustomEmptyState />}
 * />
 * ```
 */
export interface LaneWorkflowProps {
  /**
   * Additional CSS classes to apply to the container
   * @default ""
   */
  className?: string

  /**
   * Callback fired when any action emblem is clicked
   *
   * @param taskId - ID of the task being acted upon
   * @param action - The action type (cancel, retry, confirm, expand)
   */
  onTaskAction?: (taskId: string, action: ActionEmblem) => void

  /**
   * Custom component to render when all lanes are empty
   * If not provided, default empty state will be shown
   */
  emptyStateComponent?: React.ReactNode

  /**
   * Whether to show lane descriptions below titles
   * @default false
   */
  showLaneDescriptions?: boolean

  /**
   * Animation duration for lane transitions (in milliseconds)
   * @default 300
   * @constraint Must be between 100-1000ms
   */
  transitionDuration?: number

  /**
   * Whether to enable debug mode (shows internal state)
   * @default false
   */
  debug?: boolean
}

/**
 * Props for the Lane component
 *
 * Represents a single column in the kanban board (Pending, Error, or Finished).
 *
 * @example
 * ```tsx
 * <Lane
 *   config={LANE_CONFIGS.find(l => l.id === 'pending')!}
 *   tasks={pendingTasks}
 *   onTaskAction={handleAction}
 * />
 * ```
 */
export interface LaneProps {
  /**
   * Configuration for this lane (title, description, empty message)
   */
  config: LaneConfig

  /**
   * Tasks to display in this lane (already filtered by lane)
   */
  tasks: TaskWithLane[]

  /**
   * Callback fired when an action emblem is clicked on any task in this lane
   */
  onTaskAction: (taskId: string, action: ActionEmblem) => void

  /**
   * Additional CSS classes to apply to the lane container
   * @default ""
   */
  className?: string

  /**
   * Animation duration for task transitions within this lane (in milliseconds)
   * @default 300
   */
  transitionDuration?: number

  /**
   * Whether this lane is currently being dragged over (for future drag-and-drop)
   * @default false
   * @future Feature 004+
   */
  isDragOver?: boolean
}

/**
 * Props for the TaskCard component
 *
 * Displays a single task with its title, metadata, error message (if applicable),
 * and action emblems.
 *
 * @example
 * ```tsx
 * <TaskCard
 *   task={task}
 *   onAction={(action) => handleAction(task.id, action)}
 *   compact={false}
 * />
 * ```
 */
export interface TaskCardProps {
  /**
   * The task to display
   */
  task: TaskWithLane

  /**
   * Callback fired when an action emblem is clicked
   */
  onAction: (action: ActionEmblem) => void

  /**
   * Whether to show the task in compact mode (smaller, less detail)
   * @default false
   */
  compact?: boolean

  /**
   * Additional CSS classes to apply to the card
   * @default ""
   */
  className?: string

  /**
   * Whether to show timestamp (relative time)
   * @default true
   */
  showTimestamp?: boolean

  /**
   * Whether to show the expand emblem for long titles
   * @default true (automatically shown if title > 100 chars)
   */
  showExpandEmblem?: boolean

  /**
   * Animation duration for expand/collapse (in milliseconds)
   * @default 200
   */
  expandDuration?: number

  /**
   * Whether this task is currently being dragged (for future drag-and-drop)
   * @default false
   * @future Feature 004+
   */
  isDragging?: boolean
}

/**
 * Props for the ActionEmblem component
 *
 * A reusable button component for task actions (cancel, retry, confirm, expand).
 *
 * @example
 * ```tsx
 * <ActionEmblem
 *   type="cancel"
 *   tooltip="Cancel this task"
 *   onClick={() => cancelTask(task.id)}
 *   variant="ghost"
 * />
 * ```
 */
export interface ActionEmblemProps {
  /**
   * The type of action this emblem represents
   */
  type: ActionEmblem

  /**
   * Tooltip text to show on hover
   */
  tooltip: string

  /**
   * Callback fired when the emblem is clicked
   */
  onClick: () => void

  /**
   * Visual variant of the button
   * @default "ghost"
   */
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary'

  /**
   * Size of the emblem
   * @default "sm"
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the emblem is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Additional CSS classes to apply to the button
   * @default ""
   */
  className?: string

  /**
   * Accessible label for screen readers
   * If not provided, defaults to the tooltip text
   */
  ariaLabel?: string

  /**
   * Loading state (shows spinner instead of icon)
   * @default false
   */
  loading?: boolean
}

/**
 * Props for the EmptyLaneState component
 *
 * Displayed when a lane has no tasks.
 *
 * @example
 * ```tsx
 * <EmptyLaneState
 *   laneId="pending"
 *   message="No pending tasks"
 * />
 * ```
 */
export interface EmptyLaneStateProps {
  /**
   * The lane this empty state belongs to
   */
  laneId: Lane

  /**
   * Message to display
   */
  message: string

  /**
   * Optional icon to show above the message
   */
  icon?: React.ReactNode

  /**
   * Additional CSS classes to apply to the container
   * @default ""
   */
  className?: string
}

/**
 * Props for the LaneHeader component
 *
 * Header section of each lane showing title, description, and task count.
 *
 * @example
 * ```tsx
 * <LaneHeader
 *   title="Pending"
 *   description="Tasks waiting for processing"
 *   taskCount={5}
 * />
 * ```
 */
export interface LaneHeaderProps {
  /**
   * Lane title
   */
  title: string

  /**
   * Optional description text
   */
  description?: string

  /**
   * Number of tasks in this lane
   */
  taskCount: number

  /**
   * Additional CSS classes to apply to the header
   * @default ""
   */
  className?: string

  /**
   * Whether to show the task count badge
   * @default true
   */
  showCount?: boolean

  /**
   * Custom badge component to render instead of default count
   */
  customBadge?: React.ReactNode
}

/**
 * Props for the TaskTimestamp component
 *
 * Displays relative timestamp for task (e.g., "2 minutes ago").
 *
 * @example
 * ```tsx
 * <TaskTimestamp timestamp={task.updated_at} />
 * ```
 */
export interface TaskTimestampProps {
  /**
   * ISO timestamp string
   */
  timestamp: string

  /**
   * Format for the timestamp display
   * @default "relative" (e.g., "2 minutes ago")
   */
  format?: 'relative' | 'absolute'

  /**
   * Additional CSS classes to apply to the timestamp
   * @default ""
   */
  className?: string

  /**
   * Whether to show seconds in relative time
   * @default false (shows "just now" for < 1 minute)
   */
  showSeconds?: boolean
}

/**
 * Props for the ErrorMessage component
 *
 * Displays error message for tasks in the Error/More Info lane.
 *
 * @example
 * ```tsx
 * <ErrorMessage
 *   message="Backend unavailable - retry when online"
 *   severity="error"
 * />
 * ```
 */
export interface ErrorMessageProps {
  /**
   * The error message to display
   */
  message: string

  /**
   * Severity level (affects styling)
   * @default "error"
   */
  severity?: 'error' | 'warning' | 'info'

  /**
   * Additional CSS classes to apply to the message
   * @default ""
   */
  className?: string

  /**
   * Whether to show an icon next to the message
   * @default true
   */
  showIcon?: boolean

  /**
   * Whether the message can be dismissed
   * @default false
   */
  dismissible?: boolean

  /**
   * Callback fired when the message is dismissed
   */
  onDismiss?: () => void
}

/**
 * Type guard to check if a component is a valid ActionEmblem type
 */
export function isValidActionEmblem(action: string): action is ActionEmblem {
  return ['cancel', 'retry', 'confirm', 'expand'].includes(action)
}

/**
 * Type guard to check if a lane ID is valid
 */
export function isValidLane(lane: string): lane is Lane {
  return ['pending', 'error', 'finished'].includes(lane)
}
