/**
 * Tests for Lane Component
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 3 - User Story 1 (Basic Lane Visualization)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Lane } from '../Lane'
import { TaskWithLane, LANE_CONFIGS } from '@/types/task'
import { EnrichmentStatus, TaskStatus } from '@/lib/types'

// Mock task data
const mockTask: TaskWithLane = {
  id: 'task-1',
  user_input: 'Test task',
  enriched_text: 'Enriched test task',
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

const mockTasks: TaskWithLane[] = [
  mockTask,
  {
    ...mockTask,
    id: 'task-2',
    user_input: 'Second test task',
    enriched_text: 'Second test task', // Ensure unique enriched_text
  },
]

describe('Lane Component', () => {
  // T019: Write test: Lane component displays tasks passed as props
  it('should display all tasks passed as props', () => {
    const pendingLaneConfig = LANE_CONFIGS.find((c) => c.id === 'pending')!
    const mockOnAction = vi.fn()

    render(
      <Lane
        config={pendingLaneConfig}
        tasks={mockTasks}
        onTaskAction={mockOnAction}
      />
    )

    // Verify both tasks are rendered
    expect(screen.getByText('Enriched test task')).toBeInTheDocument()
    expect(screen.getByText('Second test task')).toBeInTheDocument()
  })

  it('should render lane title from config', () => {
    const pendingLaneConfig = LANE_CONFIGS.find((c) => c.id === 'pending')!
    const mockOnAction = vi.fn()

    render(
      <Lane
        config={pendingLaneConfig}
        tasks={[]}
        onTaskAction={mockOnAction}
      />
    )

    // Verify lane title is displayed
    expect(screen.getByText(pendingLaneConfig.title)).toBeInTheDocument()
  })

  it('should show empty message when no tasks', () => {
    const pendingLaneConfig = LANE_CONFIGS.find((c) => c.id === 'pending')!
    const mockOnAction = vi.fn()

    render(
      <Lane
        config={pendingLaneConfig}
        tasks={[]}
        onTaskAction={mockOnAction}
      />
    )

    // Verify empty message is displayed
    expect(screen.getByText(pendingLaneConfig.emptyMessage)).toBeInTheDocument()
  })
})
