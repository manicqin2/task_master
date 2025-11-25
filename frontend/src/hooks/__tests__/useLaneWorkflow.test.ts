/**
 * Tests for useLaneWorkflow Hook
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLaneWorkflow } from '../useLaneWorkflow'
import { Task, EnrichmentStatus, TaskStatus } from '@/lib/types'

// Mock task data
const mockPendingTask: Task = {
  id: 'task-1',
  user_input: 'Pending task',
  enriched_text: null,
  status: TaskStatus.OPEN,
  enrichment_status: EnrichmentStatus.PENDING,
  created_at: '2025-11-05T12:00:00Z',
  updated_at: '2025-11-05T12:00:00Z',
  error_message: null,
}

const mockProcessingTask: Task = {
  id: 'task-2',
  user_input: 'Processing task',
  enriched_text: null,
  status: TaskStatus.OPEN,
  enrichment_status: EnrichmentStatus.PROCESSING,
  created_at: '2025-11-05T12:01:00Z',
  updated_at: '2025-11-05T12:01:00Z',
  error_message: null,
}

const mockFailedTask: Task = {
  id: 'task-3',
  user_input: 'Failed task',
  enriched_text: null,
  status: TaskStatus.OPEN,
  enrichment_status: EnrichmentStatus.FAILED,
  created_at: '2025-11-05T12:02:00Z',
  updated_at: '2025-11-05T12:02:00Z',
  error_message: 'Processing error',
}

const mockCompletedTask: Task = {
  id: 'task-4',
  user_input: 'Completed task',
  enriched_text: 'Enriched completed task',
  status: TaskStatus.COMPLETED,
  enrichment_status: EnrichmentStatus.COMPLETED,
  created_at: '2025-11-05T12:03:00Z',
  updated_at: '2025-11-05T12:03:00Z',
  error_message: null,
}

describe('useLaneWorkflow Hook', () => {
  // T021: Write test: useLaneWorkflow hook derives lanes from task status
  it('should derive lanes from task enrichment status', () => {
    const tasks: Task[] = [
      mockPendingTask,
      mockFailedTask,
      mockCompletedTask,
    ]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify hook returns categorized tasks
    expect(result.current.pendingTasks).toBeDefined()
    expect(result.current.errorTasks).toBeDefined()
    expect(result.current.finishedTasks).toBeDefined()
  })

  // T022: Write test: Tasks with status 'pending' appear in Pending lane
  it('should put pending tasks in Pending lane', () => {
    const tasks: Task[] = [mockPendingTask]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify pending task is in pendingTasks
    expect(result.current.pendingTasks).toHaveLength(1)
    expect(result.current.pendingTasks[0].id).toBe('task-1')
    expect(result.current.pendingTasks[0].lane).toBe('pending')
  })

  // T022 continued: Tasks with status 'processing' also appear in Pending lane
  it('should put processing tasks in Pending lane', () => {
    const tasks: Task[] = [mockProcessingTask]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify processing task is in pendingTasks
    expect(result.current.pendingTasks).toHaveLength(1)
    expect(result.current.pendingTasks[0].id).toBe('task-2')
    expect(result.current.pendingTasks[0].lane).toBe('pending')
  })

  // T023: Write test: Tasks with status 'error' appear in Error/More Info lane
  it('should put failed tasks in Error lane', () => {
    const tasks: Task[] = [mockFailedTask]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify failed task is in errorTasks
    expect(result.current.errorTasks).toHaveLength(1)
    expect(result.current.errorTasks[0].id).toBe('task-3')
    expect(result.current.errorTasks[0].lane).toBe('error')
  })

  // T024: Write test: Tasks with status 'completed' appear in Finished lane
  it('should put completed tasks in Finished lane', () => {
    const tasks: Task[] = [mockCompletedTask]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify completed task is in finishedTasks
    expect(result.current.finishedTasks).toHaveLength(1)
    expect(result.current.finishedTasks[0].id).toBe('task-4')
    expect(result.current.finishedTasks[0].lane).toBe('finished')
  })

  // T025: Write test: Tasks within each lane ordered chronologically (newest first)
  it('should sort tasks chronologically with newest first', () => {
    const olderTask: Task = {
      ...mockPendingTask,
      id: 'old-task',
      created_at: '2025-11-05T10:00:00Z',
      updated_at: '2025-11-05T10:00:00Z',
    }

    const newerTask: Task = {
      ...mockPendingTask,
      id: 'new-task',
      created_at: '2025-11-05T14:00:00Z',
      updated_at: '2025-11-05T14:00:00Z',
    }

    const tasks: Task[] = [olderTask, newerTask]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify tasks are sorted newest first
    expect(result.current.pendingTasks).toHaveLength(2)
    expect(result.current.pendingTasks[0].id).toBe('new-task') // newest first
    expect(result.current.pendingTasks[1].id).toBe('old-task') // oldest last
  })

  it('should correctly distribute mixed tasks across lanes', () => {
    const tasks: Task[] = [
      mockPendingTask,
      mockProcessingTask,
      mockFailedTask,
      mockCompletedTask,
    ]

    const { result } = renderHook(() => useLaneWorkflow(tasks))

    // Verify distribution
    expect(result.current.pendingTasks).toHaveLength(2) // pending + processing
    expect(result.current.errorTasks).toHaveLength(1) // failed
    expect(result.current.finishedTasks).toHaveLength(1) // completed
  })
})
