/**
 * TaskCardErrorBoundary Component
 *
 * Error boundary to catch and handle errors in TaskCard component,
 * especially cancel action failures. Prevents entire lane from crashing
 * if a single task card encounters an error.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 4 REFACTOR - User Story 2 (Cancel Action)
 */

import React from 'react'

interface TaskCardErrorBoundaryProps {
  /**
   * Child components to wrap with error boundary
   */
  children: React.ReactNode

  /**
   * Task ID for error reporting
   */
  taskId: string

  /**
   * Optional callback fired when error is caught
   */
  onError?: (error: Error, taskId: string) => void
}

interface TaskCardErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for TaskCard component
 *
 * Catches errors during cancel action and other task operations,
 * displays fallback UI instead of crashing the entire lane.
 */
export class TaskCardErrorBoundary extends React.Component<
  TaskCardErrorBoundaryProps,
  TaskCardErrorBoundaryState
> {
  constructor(props: TaskCardErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TaskCardErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('TaskCard error boundary caught error:', {
      taskId: this.props.taskId,
      error,
      errorInfo,
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, this.props.taskId)
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when error is caught
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Error displaying task
              </p>
              <p className="text-xs text-red-600 mt-1">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
            </div>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
