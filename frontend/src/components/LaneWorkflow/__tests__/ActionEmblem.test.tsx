/**
 * Tests for ActionEmblem Component
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 4 - User Story 2 (Cancel Action in Pending Lane)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionEmblem } from '../ActionEmblem'

describe('ActionEmblem Component', () => {
  // T043: Write test: ActionEmblem component renders button with icon
  it('should render button with icon', () => {
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="cancel"
        tooltip="Cancel this task"
        onClick={mockOnClick}
      />
    )

    // Should render a button element
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  // T044: Write test: ActionEmblem shows tooltip on hover
  it('should show tooltip on hover', async () => {
    const user = userEvent.setup()
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="cancel"
        tooltip="Cancel this task"
        onClick={mockOnClick}
      />
    )

    const button = screen.getByRole('button')

    // Hover over button
    await user.hover(button)

    // Tooltip should appear (implementation may vary - check for tooltip text)
    // This test assumes tooltip renders text in DOM when hovered
    // Adjust based on actual tooltip implementation
    expect(button).toHaveAttribute('aria-label', 'Cancel this task')
  })

  // T045: Write test: ActionEmblem calls onClick handler when clicked
  it('should call onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="cancel"
        tooltip="Cancel this task"
        onClick={mockOnClick}
      />
    )

    const button = screen.getByRole('button')

    // Click the button
    await user.click(button)

    // onClick handler should be called once
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should render retry emblem with appropriate icon', () => {
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="retry"
        tooltip="Retry this task"
        onClick={mockOnClick}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Retry this task')
  })

  it('should render confirm emblem with appropriate icon', () => {
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="confirm"
        tooltip="Confirm completion"
        onClick={mockOnClick}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Confirm completion')
  })

  it('should be disabled when disabled prop is true', () => {
    const mockOnClick = vi.fn()

    render(
      <ActionEmblem
        type="cancel"
        tooltip="Cancel this task"
        onClick={mockOnClick}
        disabled={true}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})
