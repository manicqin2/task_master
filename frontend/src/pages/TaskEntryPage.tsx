/**
 * TaskEntryPage - Main page for task entry with chat interface
 *
 * Updated for Feature 003: Multi-Lane Task Workflow
 * Replaced TaskList with LaneWorkflow for kanban-style visualization
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatInput } from '@/components/ChatInput';
import { LaneWorkflow } from '@/components/LaneWorkflow';
import { useTaskPolling } from '@/services/useTaskPolling';
import { createTask } from '@/services/api';
import { Card } from '@/components/ui/card';

export function TaskEntryPage() {
  const queryClient = useQueryClient();
  const { tasks, isLoading } = useTaskPolling();
  const [error, setError] = useState<string | null>(null);

  // Mutation for creating tasks
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Invalidate and refetch tasks to show the new task immediately
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create task');
    },
  });

  const handleSubmit = async (input: string) => {
    try {
      await createTaskMutation.mutateAsync(input);
    } catch (err) {
      // Error handled by onError callback
      console.error('Failed to create task:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">TaskMaster</h1>
        <p className="text-sm text-muted-foreground">
          Rapid task capture with AI enrichment
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Lane Workflow (Feature 003) */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <LaneWorkflow />
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSubmit={handleSubmit}
        disabled={createTaskMutation.isPending}
      />
    </div>
  );
}
