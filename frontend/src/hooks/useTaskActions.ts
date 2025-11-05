/**
 * Task Actions Hook
 *
 * Provides action handlers for task interactions:
 * - cancel: Remove task from pending lane (optimistic UI update, frontend-only)
 * - retry: Re-queue failed task for processing (backend integration)
 * - confirm: Archive completed task (deferred to P4, frontend-only)
 * - expand: Toggle task card expansion for long titles
 *
 * @feature 003-task-lane-workflow
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retryTask } from '@/services/api'
import { ListTasksResponse, Task } from '@/lib/types'

/**
 * Hook for task action handlers
 *
 * Phase 4 (User Story 2): Cancel action with optimistic update
 * Phase 5 (User Story 3): Retry action with backend integration
 */
export function useTaskActions() {
  const queryClient = useQueryClient()

  /**
   * Cancel mutation - frontend-only, optimistic update
   * Removes task from React Query cache without backend communication
   */
  const cancelMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // Frontend-only - no API call
      return { taskId }
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches for tasks query
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<ListTasksResponse>(['tasks'])

      // Optimistically update by removing the task from the cache
      queryClient.setQueryData<ListTasksResponse>(['tasks'], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.filter((task) => task.id !== taskId),
          count: old.count - 1,
        }
      })

      // Return context with previous data for rollback if needed
      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      // Refetch tasks after mutation settles (success or error)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  /**
   * Retry mutation - backend integration
   * Re-submits failed task to backend processing queue
   */
  const retryMutation = useMutation({
    mutationFn: retryTask,
    onSuccess: () => {
      // Invalidate tasks query to refetch updated task status
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  /**
   * Expand mutation - frontend-only, optimistic update
   * Toggles isExpanded state for a task in React Query cache
   */
  const expandMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // Frontend-only - no API call
      return { taskId }
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<ListTasksResponse>(['tasks'])

      // Optimistically toggle isExpanded for the task
      queryClient.setQueryData<ListTasksResponse>(['tasks'], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) => {
            if (task.id === taskId) {
              // Toggle isExpanded state
              return {
                ...task,
                isExpanded: !(task as any).isExpanded, // Toggle boolean
              }
            }
            return task
          }),
        }
      })

      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
  })

  return {
    handleCancel: (taskId: string) => {
      cancelMutation.mutate(taskId)
    },
    handleRetry: (taskId: string) => {
      retryMutation.mutate(taskId)
    },
    handleConfirm: (taskId: string) => {
      // TODO: Deferred to P4 - frontend-only state update
      console.log('Confirm action deferred to P4:', taskId)
    },
    handleExpand: (taskId: string) => {
      expandMutation.mutate(taskId)
    },
    // Expose mutations for testing
    cancelMutation,
    retryMutation,
    expandMutation,
  }
}
