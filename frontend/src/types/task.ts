/**
 * Task Type Definitions for Task Master
 *
 * Base types from Feature 001 (Chat-Based Task Entry)
 * Extended types for Feature 003 (Multi-Lane Task Workflow)
 */

import { Task, EnrichmentStatus } from '@/lib/types'

/**
 * Lane identifiers for workflow visualization
 */
export type Lane = 'pending' | 'error' | 'finished'

/**
 * Action emblem types for task interactions
 */
export type ActionEmblem = 'cancel' | 'retry' | 'confirm' | 'expand'

/**
 * Extended Task interface for Feature 003 lane workflow
 * Adds computed client-side fields for UI presentation
 */
export interface TaskWithLane extends Task {
  /**
   * Computed lane assignment based on task status
   * - 'pending': status = 'pending' | 'processing'
   * - 'error': status = 'failed'
   * - 'finished': status = 'completed'
   */
  lane: Lane

  /**
   * Available action emblems for this task based on lane
   * - pending: ['cancel']
   * - error: ['retry', 'cancel']
   * - finished: ['confirm'] (deferred to P4)
   */
  emblems: ActionEmblem[]

  /**
   * Whether the task card is currently expanded (for long titles)
   */
  isExpanded: boolean

  /**
   * Whether this task has timed out (30s with no status update)
   */
  hasTimeout: boolean
}

/**
 * Lane configuration for UI rendering
 */
export interface LaneConfig {
  id: Lane
  title: string
  description: string
  emptyMessage: string
  bgColor: string
  borderColor: string
}

/**
 * Action emblem configuration for UI rendering
 */
export interface ActionEmblemConfig {
  type: ActionEmblem
  icon: string
  label: string
  variant: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary'
  tooltip: string
}

/**
 * Constants for lane configurations
 */
export const LANE_CONFIGS: LaneConfig[] = [
  {
    id: 'pending',
    title: 'Pending',
    description: 'Tasks waiting for processing',
    emptyMessage: 'No pending tasks',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'error',
    title: 'Error / More Info',
    description: 'Tasks that need attention',
    emptyMessage: 'No tasks need attention',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'finished',
    title: 'Finished',
    description: 'Completed tasks',
    emptyMessage: 'No finished tasks',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
]

/**
 * Constants for action emblem configurations
 */
export const ACTION_EMBLEM_CONFIGS: Record<ActionEmblem, ActionEmblemConfig> = {
  cancel: {
    type: 'cancel',
    icon: 'X',
    label: 'Cancel',
    variant: 'ghost',
    tooltip: 'Cancel this task',
  },
  retry: {
    type: 'retry',
    icon: 'RotateCw',
    label: 'Retry',
    variant: 'default',
    tooltip: 'Retry processing this task',
  },
  confirm: {
    type: 'confirm',
    icon: 'Check',
    label: 'Confirm',
    variant: 'default',
    tooltip: 'Confirm and archive this task',
  },
  expand: {
    type: 'expand',
    icon: 'ChevronDown',
    label: 'Expand',
    variant: 'ghost',
    tooltip: 'Show full task details',
  },
}

/**
 * Utility: Derive lane from task enrichment status
 */
export function getLaneFromStatus(enrichmentStatus: EnrichmentStatus): Lane {
  switch (enrichmentStatus) {
    case EnrichmentStatus.PENDING:
    case EnrichmentStatus.PROCESSING:
      return 'pending'
    case EnrichmentStatus.FAILED:
      return 'error'
    case EnrichmentStatus.COMPLETED:
      return 'finished'
    default:
      return 'pending'
  }
}

/**
 * Utility: Get available emblems for a lane
 */
export function getEmblemsForLane(lane: Lane): ActionEmblem[] {
  switch (lane) {
    case 'pending':
      return ['cancel']
    case 'error':
      return ['retry', 'cancel']
    case 'finished':
      return [] // P4 deferred: ['confirm']
    default:
      return []
  }
}

/**
 * Utility: Transform base Task to TaskWithLane
 */
export function enrichTaskWithLane(task: Task): TaskWithLane {
  const lane = getLaneFromStatus(task.enrichment_status)
  return {
    ...task,
    lane,
    emblems: getEmblemsForLane(lane),
    isExpanded: false,
    hasTimeout: false,
  }
}

/**
 * Type guard: Check if a task has an error
 */
export function hasError(task: Task): boolean {
  return task.error_message !== null && task.error_message.length > 0
}

/**
 * Type guard: Check if a task user_input needs truncation
 */
export function needsTruncation(userInput: string, maxLength: number = 100): boolean {
  return userInput.length > maxLength
}

/**
 * Utility: Get display text for a task (enriched_text if available, otherwise user_input)
 */
export function getTaskDisplayText(task: Task): string {
  return task.enriched_text || task.user_input
}
