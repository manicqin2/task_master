/**
 * Task Type Definitions for Task Master
 *
 * Base types from Feature 001 (Chat-Based Task Entry)
 * Extended types for Feature 003 (Multi-Lane Task Workflow)
 */

import { WorkbenchTask, EnrichmentStatus } from '@/lib/types'

/**
 * Lane identifiers for Task Workbench (task creation workflow)
 */
export type Lane = 'pending' | 'error' | 'ready'

/**
 * Action emblem types for task interactions
 */
export type ActionEmblem = 'cancel' | 'retry' | 'confirm' | 'expand'

/**
 * Extended WorkbenchTask interface for Feature 003 lane workflow
 * Adds computed client-side fields for UI presentation
 */
export interface TaskWithLane extends WorkbenchTask {
  /**
   * Computed lane assignment based on task status and metadata
   * - 'pending': status = 'pending' | 'processing'
   * - 'error': status = 'failed' OR missing required metadata (e.g., project)
   * - 'ready': status = 'completed' AND has required metadata
   */
  lane: Lane

  /**
   * Available action emblems for this task based on lane
   * - pending: ['cancel']
   * - error: ['retry', 'cancel']
   * - ready: [] (tasks ready to enter todo list)
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
 * Constants for lane configurations (Task Workbench)
 * Updated border colors to match Figma design at node-id=1:5
 */
export const LANE_CONFIGS: LaneConfig[] = [
  {
    id: 'pending',
    title: 'Pending',
    description: 'Tasks being enriched',
    emptyMessage: 'No pending tasks',
    bgColor: 'bg-blue-50',
    borderColor: 'border-[#bedbff]',
  },
  {
    id: 'error',
    title: 'More Info',
    description: 'Tasks needing attention',
    emptyMessage: 'All tasks have required info',
    bgColor: 'bg-amber-50',
    borderColor: 'border-[#fee685]',
  },
  {
    id: 'ready',
    title: 'Ready',
    description: 'Ready to enter todo list',
    emptyMessage: 'No tasks ready',
    bgColor: 'bg-green-50',
    borderColor: 'border-[#b9f8cf]',
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
 * Utility: Derive lane from task enrichment status and metadata
 * Tasks without a project go to More Info lane even if enrichment completed
 */
export function getLaneFromStatus(enrichmentStatus: EnrichmentStatus, task: WorkbenchTask): Lane {
  switch (enrichmentStatus) {
    case EnrichmentStatus.PENDING:
    case EnrichmentStatus.PROCESSING:
      return 'pending'
    case EnrichmentStatus.FAILED:
      return 'error'
    case EnrichmentStatus.COMPLETED:
      // Check if task has required metadata (project)
      if (!task.project) {
        return 'error' // Missing project → needs attention
      }
      return 'ready'
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
    case 'ready':
      return [] // Ready tasks have no actions in Task Workbench
    default:
      return []
  }
}

/**
 * Utility: Transform base WorkbenchTask to TaskWithLane
 */
export function enrichTaskWithLane(task: WorkbenchTask): TaskWithLane {
  const lane = getLaneFromStatus(task.workbench.enrichment_status, task)
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
export function hasError(task: WorkbenchTask): boolean {
  return task.workbench.error_message !== null && task.workbench.error_message.length > 0
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
export function getTaskDisplayText(task: WorkbenchTask): string {
  return task.enriched_text || task.user_input
}
