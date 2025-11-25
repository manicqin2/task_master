/**
 * ErrorMessage Component
 *
 * Displays error messages for failed tasks in the Error lane.
 * Extracted from TaskCard for better separation of concerns.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 5 REFACTOR - User Story 3
 */

import React from 'react'

export interface ErrorMessageProps {
  /**
   * Error message text to display
   */
  message: string

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * ErrorMessage component - displays task error details
 *
 * Memoized to prevent unnecessary re-renders
 */
export const ErrorMessage = React.memo(function ErrorMessage({
  message,
  className = ''
}: ErrorMessageProps) {
  return (
    <div className={`mt-2 p-2 bg-red-50 border border-red-200 rounded ${className}`}>
      <p className="text-xs text-red-800">{message}</p>
    </div>
  )
})
