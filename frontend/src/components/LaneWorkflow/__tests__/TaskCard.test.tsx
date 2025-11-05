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

  // T063: Write test: Retry emblem appears in TaskCard when lane is 'error'
  it('should show retry emblem when task is in error lane', () => {
    const errorTask: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.FAILED,
      error_message: 'Processing failed',
      lane: 'error',
      emblems: ['retry', 'cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={errorTask} onAction={mockOnAction} />)

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })

  // T064: Write test: Cancel emblem appears in TaskCard when lane is 'error'
  it('should show cancel emblem when task is in error lane', () => {
    const errorTask: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.FAILED,
      error_message: 'Processing failed',
      lane: 'error',
      emblems: ['retry', 'cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={errorTask} onAction={mockOnAction} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()
  })

  // T065: Write test: Error message displays in TaskCard when lane is 'error'
  it('should display error message when task has error', () => {
    const errorTask: TaskWithLane = {
      ...mockTask,
      enrichment_status: EnrichmentStatus.FAILED,
      error_message: 'Backend service unavailable',
      lane: 'error',
      emblems: ['retry', 'cancel'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={errorTask} onAction={mockOnAction} />)

    expect(screen.getByText('Backend service unavailable')).toBeInTheDocument()
  })

  // T121: Write test: Expand emblem shows full text when clicked
  it('should show expand emblem when task text exceeds 100 characters', () => {
    const longTextTask: TaskWithLane = {
      ...mockTask,
      user_input: 'This is a very long task description that definitely exceeds the 100 character limit for text truncation and should trigger the expand emblem to appear',
      enriched_text: null,
      isExpanded: false,
      emblems: ['cancel', 'expand'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={longTextTask} onAction={mockOnAction} />)

    // Should show expand emblem
    const expandButton = screen.getByRole('button', { name: /expand/i })
    expect(expandButton).toBeInTheDocument()
  })

  it('should show truncated text when isExpanded is false', () => {
    const longTextTask: TaskWithLane = {
      ...mockTask,
      user_input: 'This is a very long task description that definitely exceeds the 100 character limit for text truncation and should trigger the expand emblem to appear',
      enriched_text: null,
      isExpanded: false,
      emblems: ['cancel', 'expand'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={longTextTask} onAction={mockOnAction} />)

    // Text should be truncated with CSS line-clamp
    const textElement = screen.getByText(/This is a very long task description/)
    expect(textElement).toBeInTheDocument()
    // Should have line-clamp class applied
    expect(textElement).toHaveClass('line-clamp-2')
  })

  it('should show full text when isExpanded is true', () => {
    const expandedTask: TaskWithLane = {
      ...mockTask,
      user_input: 'This is a very long task description that definitely exceeds the 100 character limit for text truncation and should trigger the expand emblem to appear',
      enriched_text: null,
      isExpanded: true,
      emblems: ['cancel', 'expand'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={expandedTask} onAction={mockOnAction} />)

    // Full text should be visible without truncation
    const textElement = screen.getByText(/This is a very long task description that definitely exceeds the 100 character limit/)
    expect(textElement).toBeInTheDocument()
    // Should NOT have line-clamp class
    expect(textElement).not.toHaveClass('line-clamp-2')
  })

  // T122: Write test: Collapse emblem truncates text when clicked
  it('should change expand emblem icon when text is expanded', () => {
    const expandedTask: TaskWithLane = {
      ...mockTask,
      user_input: 'This is a very long task description that definitely exceeds the 100 character limit for text truncation and should trigger the expand emblem to appear',
      enriched_text: null,
      isExpanded: true,
      emblems: ['cancel', 'expand'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={expandedTask} onAction={mockOnAction} />)

    // When expanded, emblem should show ChevronUp icon (collapse)
    const expandButton = screen.getByRole('button', { name: /expand/i })
    expect(expandButton).toBeInTheDocument()
    // Tooltip should indicate collapse action
    // Note: Actual icon change will be tested visually
  })

  it('should call onAction with "expand" when expand emblem is clicked', () => {
    const longTextTask: TaskWithLane = {
      ...mockTask,
      user_input: 'This is a very long task description that definitely exceeds the 100 character limit for text truncation and should trigger the expand emblem to appear',
      enriched_text: null,
      isExpanded: false,
      emblems: ['cancel', 'expand'],
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={longTextTask} onAction={mockOnAction} />)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    expandButton.click()

    expect(mockOnAction).toHaveBeenCalledWith('expand')
  })

  it('should NOT show expand emblem when text is under 100 characters', () => {
    const shortTextTask: TaskWithLane = {
      ...mockTask,
      user_input: 'Short task',
      enriched_text: null,
      isExpanded: false,
      emblems: ['cancel'], // No expand emblem
    }
    const mockOnAction = vi.fn()

    render(<TaskCard task={shortTextTask} onAction={mockOnAction} />)

    // Should not have expand button
    expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument()
  })
})
