/**
 * Task with Lane Interface - Feature 003: Multi-Lane Task Workflow
 *
 * This file defines TypeScript interfaces for the extended Task type with lane fields.
 * These interfaces extend the existing Task entity from Feature 001 with computed client-side
 * fields for lane assignment and action management.
 *
 * KEY PRINCIPLE: No backend schema changes required. All lane-related state is computed
 * on the client from existing Task.status values.
 *
 * @module contracts/task-with-lane-interface
 * @version 1.0.0
 * @since Feature 003
 */

/**
 * Base Task type from Feature 001 (unchanged)
 *
 * Represents a task entity as returned from the backend API.
 * All fields are persisted in the SQLite database.
 */
export interface Task {
  /**
   * Unique task identifier (UUID v4)
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  id: string

  /**
   * Original user input from chat interface
   * @minLength 1
   * @maxLength 1000
   * @example "call mom tmrw"
   */
  user_input: string

  /**
   * LLM-enhanced task title (null during enrichment)
   * @maxLength 2000
   * @example "Call mom tomorrow to discuss weekend plans"
   */
  enriched_text: string | null

  /**
   * Task completion status (always "open" for Feature 001-003)
   * @enum "open"
   */
  status: 'open'

  /**
   * LLM enrichment processing state
   * Maps to lane via getLane() function
   */
  enrichment_status: EnrichmentStatus

  /**
   * Task creation timestamp (UTC, ISO8601)
   * @format date-time
   * @example "2025-11-05T10:30:00Z"
   */
  created_at: string

  /**
   * Last modification timestamp (UTC, ISO8601)
   * @format date-time
   * @example "2025-11-05T10:30:03Z"
   */
  updated_at: string

  /**
   * Error details if enrichment fails (null otherwise)
   * @maxLength 500
   * @example "Ollama API timeout after 5s"
   */
  error_message: string | null
}

/**
 * Enrichment status enum (from Feature 001)
 *
 * Backend task processing states that determine lane assignment:
 * - pending/processing → Pending lane
 * - failed → Error lane
 * - completed → Finished lane
 */
export type EnrichmentStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Lane identifier enum (client-side only)
 *
 * Three workflow stages for task organization:
 * - pending: Tasks waiting for or currently being processed
 * - error: Tasks that failed processing or require additional information
 * - finished: Tasks that completed successfully
 */
export type Lane = 'pending' | 'error' | 'finished'

/**
 * Action emblem type enum (client-side only)
 *
 * Available actions per lane:
 * - cancel: Remove task from UI (Pending, Error lanes)
 * - retry: Re-submit task for processing (Error lane only)
 * - confirm: Mark task as acknowledged (Finished lane, P4 deferred)
 * - expand: Show full title text (All lanes, if title >100 chars)
 */
export type ActionEmblem = 'cancel' | 'retry' | 'confirm' | 'expand'

/**
 * Extended Task with computed lane fields (client-side only)
 *
 * This interface extends the base Task with client-side computed fields.
 * These fields are NOT persisted in the database - they are derived from
 * the task's enrichment_status field.
 *
 * @extends Task
 */
export interface TaskWithLane extends Task {
  /**
   * Computed lane assignment derived from enrichment_status
   *
   * Lane derivation logic:
   * - enrichment_status === 'pending' OR 'processing' → 'pending'
   * - enrichment_status === 'failed' → 'error'
   * - enrichment_status === 'completed' → 'finished'
   *
   * @computed
   */
  lane: Lane

  /**
   * Available action emblems based on lane
   *
   * Action mapping:
   * - Pending lane: ['cancel']
   * - Error lane: ['retry', 'cancel']
   * - Finished lane: ['confirm'] (P4, deferred implementation)
   * - All lanes: ['expand'] if title length >100 chars
   *
   * @computed
   */
  action_emblems: ActionEmblem[]

  /**
   * Timestamp when task entered pending lane (ISO8601)
   *
   * Used for 30-second timeout detection. Set when task first
   * appears in pending lane, checked every 1 second by
   * usePendingTimeout hook.
   *
   * If (Date.now() - submitted_at) > 30000 and lane === 'pending':
   *   Move task to error lane with message:
   *   "Backend unavailable - retry when online"
   *
   * @optional Client-side tracking only
   * @format date-time
   * @example "2025-11-05T10:30:00Z"
   */
  submitted_at?: string

  /**
   * UI expansion state for task card
   *
   * Controls whether truncated title (>100 chars) is fully expanded.
   * Managed by local component state (useState in TaskCard).
   *
   * @optional UI state only
   * @default false
   */
  is_expanded?: boolean
}

/**
 * Action emblem configuration
 *
 * Defines visual appearance and behavior for each action emblem.
 * Used by ActionEmblem component to render icon buttons with tooltips.
 */
export interface ActionEmblemConfig {
  /**
   * Action type identifier
   */
  type: ActionEmblem

  /**
   * Icon component to render (from lucide-react or shadcn/ui)
   * @example X, RotateCw, Check, ChevronDown
   */
  icon: React.ComponentType<{ className?: string }>

  /**
   * Tooltip text displayed on hover
   * @example "Cancel this task (removes from queue)"
   */
  tooltip: string

  /**
   * Click handler function
   * @param taskId - UUID of task to perform action on
   */
  onClick: (taskId: string) => void

  /**
   * Button visual variant (shadcn/ui Button component)
   * @default 'default'
   */
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary'

  /**
   * Button size variant (shadcn/ui Button component)
   * @default 'icon'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Additional CSS classes for custom styling
   */
  className?: string

  /**
   * Disable the action emblem (e.g., during mutation)
   * @default false
   */
  disabled?: boolean
}

/**
 * Lane configuration
 *
 * Defines visual appearance and behavior for each workflow lane.
 * Used by Lane component to render column headers and empty states.
 */
export interface LaneConfig {
  /**
   * Lane identifier (matches Lane enum)
   */
  id: Lane

  /**
   * Display title for lane header
   * @example "Pending", "Error / More Info", "Finished"
   */
  title: string

  /**
   * Optional description shown below title
   * @example "Tasks waiting for processing"
   */
  description?: string

  /**
   * Message displayed when lane is empty
   * @example "No pending tasks"
   */
  emptyMessage: string

  /**
   * Backend enrichment statuses that map to this lane
   *
   * Used for filtering tasks into lanes:
   * - Pending: ['pending', 'processing']
   * - Error: ['failed']
   * - Finished: ['completed']
   */
  taskStatuses: EnrichmentStatus[]

  /**
   * Maximum number of tasks to display before showing "Show more" button
   * @default undefined (no limit)
   */
  maxVisible?: number

  /**
   * CSS classes for lane container styling
   */
  className?: string

  /**
   * Icon component for lane header (optional)
   */
  icon?: React.ComponentType<{ className?: string }>
}

/**
 * Lane grouping result
 *
 * Result of grouping tasks by lane. Used by LaneContainer component
 * to render three separate Lane components.
 *
 * @example
 * {
 *   pending: [task1, task2],
 *   error: [task3],
 *   finished: [task4, task5, task6]
 * }
 */
export interface GroupedTasks {
  pending: TaskWithLane[]
  error: TaskWithLane[]
  finished: TaskWithLane[]
}

/**
 * Task actions interface
 *
 * Defines the action handlers exposed by task management hooks.
 * Used by TaskCard component to trigger mutations.
 */
export interface TaskActions {
  /**
   * Cancel a task (remove from UI, frontend-only)
   *
   * For Pending lane: Optimistic update, no backend call
   * For Error lane: Optimistic update, no backend call
   *
   * If task is already processing, attempt will fail and task
   * will be moved to Error lane with message:
   * "Cancellation failed - task already processing"
   *
   * @param taskId - UUID of task to cancel
   * @returns Promise resolving when optimistic update completes
   */
  cancelTask: (taskId: string) => Promise<void>

  /**
   * Retry a failed task (re-submit to backend)
   *
   * Only available in Error lane. Calls POST /api/v1/tasks/:id/retry
   * which clears error_message, sets enrichment_status to 'pending',
   * and re-enqueues task for processing.
   *
   * @param taskId - UUID of task to retry
   * @returns Promise resolving to updated task
   * @throws Error if task not found (404) or not in retryable state (400)
   */
  retryTask: (taskId: string) => Promise<TaskWithLane>

  /**
   * Confirm a finished task (mark as acknowledged)
   *
   * Only available in Finished lane (P4, deferred implementation).
   * Future implementation will persist confirmation state to backend.
   *
   * @param taskId - UUID of task to confirm
   * @returns Promise resolving to updated task
   * @deprecated Priority P4, not implemented in initial release
   */
  confirmTask?: (taskId: string) => Promise<TaskWithLane>

  /**
   * Toggle task card expansion (show full title)
   *
   * Available for tasks with title length >100 characters.
   * Updates local component state only (useState).
   *
   * @param taskId - UUID of task to expand/collapse
   */
  toggleExpanded: (taskId: string) => void
}

/**
 * Utility: Derive lane from task enrichment status
 *
 * Pure function that maps backend enrichment_status to client-side lane.
 * Used by task transformation logic in useTasksQuery hook.
 *
 * @param task - Base task object from backend API
 * @returns Computed lane identifier
 *
 * @example
 * getLane({ enrichment_status: 'pending', ... }) // => 'pending'
 * getLane({ enrichment_status: 'failed', ... })  // => 'error'
 * getLane({ enrichment_status: 'completed', ... }) // => 'finished'
 */
export function getLane(task: Task): Lane {
  if (task.enrichment_status === 'pending' || task.enrichment_status === 'processing') {
    return 'pending'
  }
  if (task.enrichment_status === 'failed') {
    return 'error'
  }
  if (task.enrichment_status === 'completed') {
    return 'finished'
  }

  // Fallback for unknown status (should never happen)
  console.warn(`Unknown enrichment_status: ${task.enrichment_status}`)
  return 'error'
}

/**
 * Utility: Get action emblems for a lane
 *
 * Pure function that returns available actions based on lane.
 * Used by TaskCard component to render action buttons.
 *
 * @param lane - Lane identifier
 * @param titleLength - Length of task title (for expand button)
 * @returns Array of action emblem identifiers
 *
 * @example
 * getActionEmblems('pending', 50)  // => ['cancel']
 * getActionEmblems('error', 150)   // => ['retry', 'cancel', 'expand']
 * getActionEmblems('finished', 50) // => ['confirm']
 */
export function getActionEmblems(lane: Lane, titleLength: number): ActionEmblem[] {
  const emblems: ActionEmblem[] = []

  if (lane === 'pending') {
    emblems.push('cancel')
  }

  if (lane === 'error') {
    emblems.push('retry', 'cancel')
  }

  if (lane === 'finished') {
    // Priority P4, deferred implementation
    // emblems.push('confirm')
  }

  // Add expand action for long titles (all lanes)
  if (titleLength > 100) {
    emblems.push('expand')
  }

  return emblems
}

/**
 * Utility: Transform base task to TaskWithLane
 *
 * Enriches backend task with computed client-side fields.
 * Used by useTasksQuery hook to transform fetched tasks.
 *
 * @param task - Base task object from backend API
 * @returns Task with computed lane and action emblems
 *
 * @example
 * const taskWithLane = transformTask({
 *   id: 'abc123',
 *   user_input: 'call mom',
 *   enrichment_status: 'pending',
 *   // ... other fields
 * })
 * // taskWithLane.lane === 'pending'
 * // taskWithLane.action_emblems === ['cancel']
 */
export function transformTask(task: Task): TaskWithLane {
  const lane = getLane(task)
  const titleLength = task.enriched_text?.length || task.user_input.length
  const action_emblems = getActionEmblems(lane, titleLength)

  return {
    ...task,
    lane,
    action_emblems,
    // submitted_at set separately by usePendingTimeout hook
    // is_expanded set separately by TaskCard local state
  }
}

/**
 * Utility: Group tasks by lane
 *
 * Groups an array of TaskWithLane objects into three separate arrays
 * by lane identifier. Used by LaneContainer component for rendering.
 *
 * Tasks within each lane are sorted chronologically (newest first)
 * by updated_at timestamp.
 *
 * @param tasks - Array of tasks with lane field
 * @returns Object with tasks grouped by lane
 *
 * @example
 * const grouped = groupTasksByLane([task1, task2, task3])
 * // {
 * //   pending: [task1, task2],
 * //   error: [],
 * //   finished: [task3]
 * // }
 */
export function groupTasksByLane(tasks: TaskWithLane[]): GroupedTasks {
  // Initialize empty arrays for each lane
  const grouped: GroupedTasks = {
    pending: [],
    error: [],
    finished: [],
  }

  // Group tasks by lane
  for (const task of tasks) {
    grouped[task.lane].push(task)
  }

  // Sort each lane by updated_at (newest first)
  const sortByUpdatedAt = (a: TaskWithLane, b: TaskWithLane) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }

  grouped.pending.sort(sortByUpdatedAt)
  grouped.error.sort(sortByUpdatedAt)
  grouped.finished.sort(sortByUpdatedAt)

  return grouped
}

/**
 * Constants: Lane configurations
 *
 * Predefined configuration for three workflow lanes.
 * Used by LaneContainer component to render lane headers and empty states.
 */
export const LANE_CONFIGS: LaneConfig[] = [
  {
    id: 'pending',
    title: 'Pending',
    description: 'Tasks waiting for processing',
    emptyMessage: 'No pending tasks',
    taskStatuses: ['pending', 'processing'],
  },
  {
    id: 'error',
    title: 'Error / More Info',
    description: 'Tasks requiring attention',
    emptyMessage: 'No errors or information requests',
    taskStatuses: ['failed'],
  },
  {
    id: 'finished',
    title: 'Finished',
    description: 'Completed tasks',
    emptyMessage: 'No finished tasks yet',
    taskStatuses: ['completed'],
  },
]

/**
 * Constants: Timeout configuration
 */
export const PENDING_TIMEOUT_MS = 30000 // 30 seconds
export const TIMEOUT_CHECK_INTERVAL_MS = 1000 // 1 second
export const TITLE_TRUNCATE_LENGTH = 100 // characters

/**
 * Type guard: Check if task is in timeout state
 *
 * @param task - Task with submitted_at timestamp
 * @returns True if task has been in pending lane for >30 seconds
 */
export function isTaskTimedOut(task: TaskWithLane): boolean {
  if (!task.submitted_at || task.lane !== 'pending') {
    return false
  }

  const submittedAt = new Date(task.submitted_at).getTime()
  const now = Date.now()
  return now - submittedAt > PENDING_TIMEOUT_MS
}

/**
 * Utility: Check if title should be truncated
 *
 * @param title - Task title or user input
 * @returns True if title exceeds truncation length
 */
export function shouldTruncateTitle(title: string): boolean {
  return title.length > TITLE_TRUNCATE_LENGTH
}

/**
 * Utility: Truncate title with ellipsis
 *
 * @param title - Task title or user input
 * @returns Truncated title with ellipsis if needed
 *
 * @example
 * truncateTitle('Short title') // => 'Short title'
 * truncateTitle('A'.repeat(150)) // => 'AAA...AAA' (100 chars + '...')
 */
export function truncateTitle(title: string): string {
  if (!shouldTruncateTitle(title)) {
    return title
  }
  return title.slice(0, TITLE_TRUNCATE_LENGTH) + '...'
}
