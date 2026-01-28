/**
 * Component tests for DeadlineInput
 * Feature 008: Task Management UI Enhancements - User Story 2
 *
 * Tests natural language deadline input with live preview.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeadlineInput } from '@/components/TaskWorkbench/DeadlineInput'

describe('DeadlineInput Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render input field with placeholder', () => {
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('tomorrow'))
  })

  it('should display natural language input as user types', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'tomorrow')

    expect(input).toHaveValue('tomorrow')
  })

  it('should show preview of parsed date for "tomorrow"', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'tomorrow')

    // Should show preview like "→ 2025-06-16"
    const preview = screen.getByText(/2025-06-16|June 16/)
    expect(preview).toBeInTheDocument()
  })

  it('should show preview of parsed date for "next Friday"', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'next Friday')

    // Should show preview like "→ 2025-06-20"
    const preview = screen.getByText(/2025-06-20|June 20/)
    expect(preview).toBeInTheDocument()
  })

  it('should show preview of parsed date for "in 2 weeks"', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'in 2 weeks')

    // Should show preview like "→ 2025-06-29"
    const preview = screen.getByText(/2025-06-29|June 29/)
    expect(preview).toBeInTheDocument()
  })

  it('should accept ISO date format passthrough', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '2025-12-31')

    // Should show same date in preview
    const preview = screen.getByText(/2025-12-31|December 31/)
    expect(preview).toBeInTheDocument()
  })

  it('should call onChange with ISO date string on blur', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'tomorrow')
    await user.tab() // Blur event

    // Should call onChange with ISO date
    expect(mockOnChange).toHaveBeenCalledWith('2025-06-16')
  })

  it('should call onChange with ISO date string on Enter key', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'next Friday{Enter}')

    // Should call onChange with ISO date
    expect(mockOnChange).toHaveBeenCalledWith('2025-06-20')
  })

  it('should show error message for invalid input', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'invalid gibberish')

    // Should show error or no preview
    const container = input.closest('div')
    expect(container).toBeInTheDocument()

    // Should not find a valid date preview
    expect(screen.queryByText(/2025-/)).not.toBeInTheDocument()
  })

  it('should handle empty input gracefully', () => {
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')

    // Should not show any preview for empty input
    expect(screen.queryByText(/→/)).not.toBeInTheDocument()
  })

  it('should display pre-filled value', () => {
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="2025-12-25" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('2025-12-25')
  })

  it('should update when value prop changes', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<DeadlineInput value="tomorrow" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('tomorrow')

    rerender(<DeadlineInput value="next Friday" onChange={mockOnChange} />)
    expect(input).toHaveValue('next Friday')
  })

  it('should clear input when value is set to empty string', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<DeadlineInput value="tomorrow" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('tomorrow')

    rerender(<DeadlineInput value="" onChange={mockOnChange} />)
    expect(input).toHaveValue('')
  })

  it('should be disabled when disabled prop is true', () => {
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} disabled={true} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('should handle "next Monday" on Monday correctly (+7 days)', async () => {
    // Set to Monday June 16, 2025
    vi.setSystemTime(new Date('2025-06-16T10:00:00Z'))

    const user = userEvent.setup({ delay: null })
    const mockOnChange = vi.fn()

    render(<DeadlineInput value="" onChange={mockOnChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'next Monday')

    // Should preview next week Monday (June 23), not today
    const preview = screen.getByText(/2025-06-23|June 23/)
    expect(preview).toBeInTheDocument()
  })
})
