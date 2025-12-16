/**
 * Task Actions Hook
 *
 * Provides action handlers for task interactions:
 * - cancel: Remove task from lane (deletes from backend if in error lane)
 * - retry: Re-queue failed task for processing (backend integration)
 * - confirm: Archive completed task (deferred to P4, frontend-only)
 * - expand: Toggle task card expansion for long titles
 *
 * @feature 003-task-lane-workflow
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retryTask, deleteTask, updateTaskMetadata, UpdateMetadataRequest, moveTaskToTodos } from '@/services/api'
import { ListWorkbenchTasksResponse, WorkbenchTask } from '@/lib/types'

/**
 * Hook for task action handlers
 *
 * Phase 4 (User Story 2): Cancel action with optimistic update
 * Phase 5 (User Story 3): Retry action with backend integration
 */
export function useTaskActions(onRephraseCallback?: (originalText: string) => void) {
  const queryClient = useQueryClient()

  /**
   * Cancel mutation
   * - For More Info lane tasks (failed OR missing project): Deletes from backend
   * - For other tasks: Frontend-only removal from cache
   */
  const cancelMutation = useMutation({
    mutationFn: async ({ taskId, shouldDelete }: { taskId: string; shouldDelete: boolean }) => {
      if (shouldDelete) {
        // Delete from backend for More Info lane tasks
        await deleteTask(taskId)
      }
      // For other tasks, frontend-only (no API call needed)

      return { taskId }
    },
    onMutate: async ({ taskId, shouldDelete }) => {
      // Cancel any outgoing refetches for workbench tasks query
      await queryClient.cancelQueries({ queryKey: ['workbench-tasks'] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<ListWorkbenchTasksResponse>(['workbench-tasks'])

      // Optimistically update by removing the task from the cache
      queryClient.setQueryData<ListWorkbenchTasksResponse>(['workbench-tasks'], (old) => {
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
    onError: (err, { taskId }, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['workbench-tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      // Refetch tasks after mutation settles (success or error)
      queryClient.invalidateQueries({ queryKey: ['workbench-tasks'] })
    },
  })

  /**
   * Retry mutation - backend integration
   * Re-submits failed task to backend processing queue
   */
  const retryMutation = useMutation({
    mutationFn: retryTask,
    onSuccess: () => {
      // Invalidate workbench tasks query to refetch updated task status
      queryClient.invalidateQueries({ queryKey: ['workbench-tasks'] })
    },
  })

  /**
   * Update metadata mutation - backend integration
   * Updates task metadata (e.g., project) and invalidates query
   */
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ taskId, metadata }: { taskId: string; metadata: UpdateMetadataRequest }) => {
      return await updateTaskMetadata(taskId, metadata)
    },
    onSuccess: () => {
      // Invalidate workbench tasks query to refetch with updated metadata
      queryClient.invalidateQueries({ queryKey: ['workbench-tasks'] })
    },
  })

  /**
   * Move to todos mutation - backend integration
   * Moves a task from Ready lane to the todos list
   */
  const moveToTodosMutation = useMutation({
    mutationFn: moveTaskToTodos,
    onSuccess: () => {
      // Invalidate both queries to update workbench and todos views
      queryClient.invalidateQueries({ queryKey: ['workbench-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] })
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
      await queryClient.cancelQueries({ queryKey: ['workbench-tasks'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<ListWorkbenchTasksResponse>(['workbench-tasks'])

      // Optimistically toggle isExpanded for the task
      queryClient.setQueryData<ListWorkbenchTasksResponse>(['workbench-tasks'], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task: WorkbenchTask) => {
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
        queryClient.setQueryData(['workbench-tasks'], context.previousTasks)
      }
    },
  })

  return {
    handleCancel: (taskId: string) => {
      // Always delete the task from the backend
      cancelMutation.mutate({ taskId, shouldDelete: true })
    },
    handleRetry: (taskId: string) => {
      retryMutation.mutate(taskId)
    },
    handleConfirm: (taskId: string) => {
      // Move task from Ready lane to todos list
      moveToTodosMutation.mutate(taskId)
    },
    handleExpand: (taskId: string) => {
      expandMutation.mutate(taskId)
    },
    handleUpdateMetadata: (taskId: string, metadata: UpdateMetadataRequest) => {
      updateMetadataMutation.mutate({ taskId, metadata })
    },
    handleRephrase: (taskId: string) => {
      // Get the task to access its user_input
      const tasks = queryClient.getQueryData<ListWorkbenchTasksResponse>(['workbench-tasks'])
      const task = tasks?.tasks.find((t) => t.id === taskId)

      if (task && onRephraseCallback) {
        // Move the original user input back to the query bar
        onRephraseCallback(task.user_input)

        // Delete the task from the workbench
        cancelMutation.mutate({ taskId, shouldDelete: true })
      }
    },
    // Expose mutations for testing
    cancelMutation,
    retryMutation,
    expandMutation,
    updateMetadataMutation,
    moveToTodosMutation,
  }
}
