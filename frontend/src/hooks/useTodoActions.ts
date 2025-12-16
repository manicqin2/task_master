/**
 * Todo Actions Hook
 *
 * Provides action handlers for todo list interactions:
 * - finish: Mark task as completed
 * - archive: Mark task as archived
 *
 * @feature Todos View
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTaskStatus } from '@/services/api'
import { ListTodoTasksResponse } from '@/lib/types'

/**
 * Hook for todo action handlers
 */
export function useTodoActions() {
  const queryClient = useQueryClient()

  /**
   * Finish mutation - marks task as completed
   */
  const finishMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await updateTaskStatus(taskId, 'completed')
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todo-tasks'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<ListTodoTasksResponse>(['todo-tasks'])

      // Optimistically update task status
      queryClient.setQueryData(['todo-tasks'], (old: ListTodoTasksResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((task) =>
            task.id === taskId
              ? { ...task, todo: { ...task.todo, status: 'completed' as const } }
              : task
          ),
        }
      })

      return { previousTasks }
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['todo-tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      // Refetch tasks after mutation settles
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] })
    },
  })

  /**
   * Archive mutation - marks task as archived
   */
  const archiveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await updateTaskStatus(taskId, 'archived')
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todo-tasks'] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<ListTodoTasksResponse>(['todo-tasks'])

      // Optimistically remove archived task from list
      queryClient.setQueryData(['todo-tasks'], (old: ListTodoTasksResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.filter((task) => task.id !== taskId),
          count: old.count - 1,
        }
      })

      return { previousTasks }
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['todo-tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      // Refetch tasks after mutation settles
      queryClient.invalidateQueries({ queryKey: ['todo-tasks'] })
    },
  })

  return {
    handleFinish: (taskId: string) => {
      finishMutation.mutate(taskId)
    },
    handleArchive: (taskId: string) => {
      archiveMutation.mutate(taskId)
    },
    // Expose mutations for testing
    finishMutation,
    archiveMutation,
  }
}
