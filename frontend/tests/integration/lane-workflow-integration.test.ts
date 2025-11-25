/**
 * Integration Test: Full Lane Workflow
 * Feature 003: Multi-Lane Task Workflow
 *
 * T099: Full lane workflow (create → pending → error → retry → finished)
 */

import { describe, it, expect, beforeEach, vi} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLaneWorkflow } from '../../src/hooks/useLaneWorkflow';
import { useTaskActions } from '../../src/hooks/useTaskActions';
import type { Task } from '../../src/types/task';
import React from 'react';

describe('Lane Workflow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  function createWrapper() {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
    };
  }

  it('should derive correct lane from task enrichment status', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        user_input: 'Test task 1',
        enriched_text: null,
        status: 'open',
        enrichment_status: 'pending',
        created_at: '2025-11-05T12:00:00Z',
        updated_at: '2025-11-05T12:00:00Z',
        error_message: null,
      },
      {
        id: '2',
        user_input: 'Test task 2',
        enriched_text: null,
        status: 'open',
        enrichment_status: 'failed',
        created_at: '2025-11-05T12:00:00Z',
        updated_at: '2025-11-05T12:00:00Z',
        error_message: 'Processing failed',
      },
      {
        id: '3',
        user_input: 'Test task 3',
        enriched_text: 'Enriched text',
        status: 'open',
        enrichment_status: 'completed',
        created_at: '2025-11-05T12:00:00Z',
        updated_at: '2025-11-05T12:00:00Z',
        error_message: null,
      },
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLaneWorkflow(mockTasks), { wrapper });

    // Verify lane assignments
    expect(result.current.pendingTasks).toHaveLength(1);
    expect(result.current.pendingTasks[0].id).toBe('1');

    expect(result.current.errorTasks).toHaveLength(1);
    expect(result.current.errorTasks[0].id).toBe('2');

    expect(result.current.finishedTasks).toHaveLength(1);
    expect(result.current.finishedTasks[0].id).toBe('3');
  });

  it('should handle task status transitions through lanes', async () => {
    // Mock initial task in pending state
    let currentTask: Task = {
      id: '1',
      user_input: 'Task in transition',
      enriched_text: null,
      status: 'open',
      enrichment_status: 'pending',
      created_at: '2025-11-05T12:00:00Z',
      updated_at: '2025-11-05T12:00:00Z',
      error_message: null,
    };

    const wrapper = createWrapper();

    // Initial render - task in pending
    const { result, rerender } = renderHook(() => useLaneWorkflow([currentTask]), { wrapper });

    expect(result.current.pendingTasks).toHaveLength(1);
    expect(result.current.errorTasks).toHaveLength(0);
    expect(result.current.finishedTasks).toHaveLength(0);

    // Simulate task failing
    currentTask = {
      ...currentTask,
      enrichment_status: 'failed',
      error_message: 'Processing error',
    };

    rerender();

    await waitFor(() => {
      expect(result.current.pendingTasks).toHaveLength(0);
      expect(result.current.errorTasks).toHaveLength(1);
      expect(result.current.finishedTasks).toHaveLength(0);
    });

    // Simulate task completing after retry
    currentTask = {
      ...currentTask,
      enrichment_status: 'completed',
      enriched_text: 'Now enriched',
      error_message: null,
    };

    rerender();

    await waitFor(() => {
      expect(result.current.pendingTasks).toHaveLength(0);
      expect(result.current.errorTasks).toHaveLength(0);
      expect(result.current.finishedTasks).toHaveLength(1);
    });
  });

  it('should maintain chronological order within each lane', () => {
    const now = new Date('2025-11-05T12:00:00Z');
    const mockTasks: Task[] = [
      {
        id: '1',
        user_input: 'Oldest task',
        enriched_text: null,
        status: 'open',
        enrichment_status: 'pending',
        created_at: new Date(now.getTime() - 3000).toISOString(),
        updated_at: new Date(now.getTime() - 3000).toISOString(),
        error_message: null,
      },
      {
        id: '2',
        user_input: 'Middle task',
        enriched_text: null,
        status: 'open',
        enrichment_status: 'pending',
        created_at: new Date(now.getTime() - 2000).toISOString(),
        updated_at: new Date(now.getTime() - 2000).toISOString(),
        error_message: null,
      },
      {
        id: '3',
        user_input: 'Newest task',
        enriched_text: null,
        status: 'open',
        enrichment_status: 'pending',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        error_message: null,
      },
    ];

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLaneWorkflow(mockTasks), { wrapper });

    // Tasks should be ordered newest first
    expect(result.current.pendingTasks[0].id).toBe('3'); // Newest
    expect(result.current.pendingTasks[1].id).toBe('2'); // Middle
    expect(result.current.pendingTasks[2].id).toBe('1'); // Oldest
  });
});
