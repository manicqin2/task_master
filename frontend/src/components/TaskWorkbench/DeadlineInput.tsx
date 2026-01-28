/**
 * DeadlineInput Component
 * Feature 008: Task Management UI Enhancements - User Story 2
 *
 * Natural language deadline input with live preview of parsed date.
 */

import { useState, useEffect } from 'react'
import { parseNaturalLanguageDate, formatToISO } from '@/lib/dateUtils'

export interface DeadlineInputProps {
  /** Current deadline value (natural language or ISO date) */
  value: string

  /** Callback when deadline is confirmed (receives ISO date string) */
  onChange: (isoDate: string) => void

  /** Whether the input is disabled */
  disabled?: boolean
}

/**
 * DeadlineInput component with natural language parsing
 */
export function DeadlineInput({ value, onChange, disabled = false }: DeadlineInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [previewDate, setPreviewDate] = useState<Date | null>(null)

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Update preview as user types
  useEffect(() => {
    if (inputValue && inputValue.trim() !== '') {
      const parsed = parseNaturalLanguageDate(inputValue)
      setPreviewDate(parsed)
    } else {
      setPreviewDate(null)
    }
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleConfirm = () => {
    if (previewDate) {
      const isoDate = formatToISO(previewDate)
      onChange(isoDate)
    } else if (inputValue.trim() === '') {
      onChange('')
    }
  }

  const handleBlur = () => {
    handleConfirm()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  // Format preview date for display
  const formattedPreview = previewDate
    ? previewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const isoPreview = previewDate ? formatToISO(previewDate) : null

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="e.g., tomorrow, next Friday, 2025-12-31"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
        aria-label="Deadline input"
      />

      {/* Preview of parsed date */}
      {inputValue && inputValue.trim() !== '' && previewDate && (
        <div className="text-xs text-green-700">
          ✓ {formattedPreview} ({isoPreview})
        </div>
      )}

      {/* Error message for invalid input */}
      {inputValue && inputValue.trim() !== '' && !previewDate && (
        <div className="text-xs text-red-600">
          ⚠ Unable to parse. Try "tomorrow", "next Friday", or "YYYY-MM-DD".
        </div>
      )}
    </div>
  )
}
