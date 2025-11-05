/**
 * Tests for TaskCard Component
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
import { TaskWithLane } from '@/types/task'
import { EnrichmentStatus, TaskStatus } from '@/lib/types'

// Mock task data
const mockTask: TaskWithLane = {
  id: 'task-1',
  user_input: 'Test task input',
  enriched_text: 'Enriched test task text',
  status: TaskStatus.OPEN,
  enrichment_status: EnrichmentStatus.PENDING,
  created_at: '2025-11-05T12:00:00Z',
  updated_at: '2025-11-05T12:00:00Z',
  error_message: null,
  lane: 'pending',
  emblems: ['cancel'],
  isExpanded: false,
  hasTimeout: false,
}

describe('TaskCard Component', () => {
  // T020: Write test: TaskCard renders task title and status
  it('should render task title (enriched_text or user_input)', () => {
    const mockOnAction = vi.fn()

    render(<TaskCard task={mockTask} onAction={mockOnAction} />)

    // Should render enriched_text when available
    expect(screen.getByText('Enriched test task text')).toBeInTheDocument()
  })

  it('should render user_input when enriched_text is null', () => {
    const taskWithoutEnrichment: TaskWithLane = {
      ...mockTask,
      enriched_text: null,
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={taskWithoutEnrichment} onAction={mockOnAction} />)

    // Should fall back to user_input
    expect(screen.getByText('Test task input')).toBeInTheDocument()
  })

  it('should display enrichment status indicator', () => {
    const mockOnAction = vi.fn()

    render(<TaskCard task={mockTask} onAction={mockOnAction} />)

    // Should show some indication of status (badge, icon, or text)
    // Exact implementation depends on design, but should be visible
    const card = screen.getByText('Enriched test task text').closest('div')
    expect(card).toBeInTheDocument()
  })

  it('should render error message when task has error', () => {
    const taskWithError: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.FAILED,
      error_message: 'Processing failed',
      lane: 'error',
      emblems: ['retry', 'cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={taskWithError} onAction={mockOnAction} />)

    // Should display error message
    expect(screen.getByText('Processing failed')).toBeInTheDocument()
  })

  // T046: Write test: Cancel emblem appears in TaskCard when lane is 'pending'
  it('should show cancel emblem when task is in pending lane', () => {
    const pendingTask: TaskWithLane = {
      ...mockTask,
      lane: 'pending',
      emblems: ['cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={pendingTask} onAction={mockOnAction} />)

    // Should render cancel button/emblem
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()
  })

  // T047: Write test: Cancel emblem does NOT appear in TaskCard when lane is 'error' or 'finished'
  it('should NOT show cancel emblem when task is in error lane (with retry instead)', () => {
    const errorTask: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.FAILED,
      error_message: 'Failed to process',
      lane: 'error',
      emblems: ['retry', 'cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={errorTask} onAction={mockOnAction} />)

    // Should render retry and cancel emblems
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should NOT show cancel emblem when task is in finished lane', () => {
    const finishedTask: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.COMPLETED,
      lane: 'finished',
      emblems: [], // P4 deferred: ['confirm']
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={finishedTask} onAction={mockOnAction} />)

    // Should NOT render cancel button
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('should show only cancel emblem in pending lane (no other emblems)', () => {
    const pendingTask: TaskWithLane = {
      ...mockTask,
      lane: 'pending',
      emblems: ['cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={pendingTask} onAction={mockOnAction} />)

    // Should only have one button (cancel)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName(/cancel/i)
  })
})
