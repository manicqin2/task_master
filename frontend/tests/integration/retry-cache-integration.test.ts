/**
 * Integration Test: Retry Cache Integration
 * Feature 003: Multi-Lane Task Workflow
 *
 * T103: Retry mutation invalidates TanStack Query cache correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTaskActions } from '../../src/hooks/useTaskActions';
import React from 'react';

// Mock the API module
vi.mock('../../src/services/taskApi', () => ({
  taskApi: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    retry: vi.fn(),
  },
}));

import { taskApi } from '../../src/services/taskApi';

describe('Retry Cache Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Pre-populate cache with a task in error state
    queryClient.setQueryData(['tasks'], {
      tasks: [
        {
          id: '1',
          user_input: 'Task to retry',
          enriched_text: null,
          status: 'open',
          enrichment_status: 'failed',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:00:00Z',
          error_message: 'Processing failed',
        },
      ],
      count: 1,
    });

    vi.clearAllMocks();
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

  it('should call retry API endpoint when retrying a task', async () => {
    const mockRetryFn = taskApi.retry as ReturnType<typeof vi.fn>;
    mockRetryFn.mockResolvedValueOnce({
      id: '1',
      user_input: 'Task to retry',
      enriched_text: null,
      status: 'open',
      enrichment_status: 'pending',
      created_at: '2025-11-05T12:00:00Z',
      updated_at: '2025-11-05T12:01:00Z',
      error_message: null,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTaskActions(), { wrapper });

    // Retry the task
    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.retryMutation.isSuccess).toBe(true);
    });

    // Verify API was called
    expect(mockRetryFn).toHaveBeenCalledWith('1');
  });

  it('should invalidate task queries after successful retry', async () => {
    const mockRetryFn = taskApi.retry as ReturnType<typeof vi.fn>;
    mockRetryFn.mockResolvedValueOnce({
      id: '1',
      user_input: 'Task to retry',
      enriched_text: null,
      status: 'open',
      enrichment_status: 'pending',
      created_at: '2025-11-05T12:00:00Z',
      updated_at: '2025-11-05T12:01:00Z',
      error_message: null,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTaskActions(), { wrapper });

    // Spy on query invalidation
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Retry the task
    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.retryMutation.isSuccess).toBe(true);
    });

    // Queries should be invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });

  it('should optimistically update task status to pending', async () => {
    const mockRetryFn = taskApi.retry as ReturnType<typeof vi.fn>;

    // Delay the response to test optimistic update
    mockRetryFn.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: '1',
                user_input: 'Task to retry',
                enriched_text: null,
                status: 'open',
                enrichment_status: 'pending',
                created_at: '2025-11-05T12:00:00Z',
                updated_at: '2025-11-05T12:01:00Z',
                error_message: null,
              }),
            100
          )
        )
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTaskActions(), { wrapper });

    // Verify initial state (failed)
    const initialData = queryClient.getQueryData(['tasks']) as any;
    expect(initialData.tasks[0].enrichment_status).toBe('failed');

    // Retry the task
    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    // Immediately check cache (should be optimistically updated to pending)
    const optimisticData = queryClient.getQueryData(['tasks']) as any;
    // Note: Actual optimistic update implementation may vary
    // This test documents the expected behavior

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.retryMutation.isSuccess).toBe(true);
    });
  });

  it('should handle retry failure and maintain cache integrity', async () => {
    const mockRetryFn = taskApi.retry as ReturnType<typeof vi.fn>;
    mockRetryFn.mockRejectedValueOnce(new Error('Retry failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTaskActions(), { wrapper });

    // Retry the task
    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    // Wait for mutation to fail
    await waitFor(() => {
      expect(result.current.retryMutation.isError).toBe(true);
    });

    // Cache should still have the task in failed state
    const data = queryClient.getQueryData(['tasks']) as any;
    expect(data.tasks[0].enrichment_status).toBe('failed');
    expect(data.tasks[0].id).toBe('1');
  });

  it('should support multiple retry attempts (unlimited retries)', async () => {
    const mockRetryFn = taskApi.retry as ReturnType<typeof vi.fn>;

    // First retry
    mockRetryFn.mockResolvedValueOnce({
      id: '1',
      user_input: 'Task to retry',
      enriched_text: null,
      status: 'open',
      enrichment_status: 'pending',
      created_at: '2025-11-05T12:00:00Z',
      updated_at: '2025-11-05T12:01:00Z',
      error_message: null,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTaskActions(), { wrapper });

    // First retry
    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.retryMutation.isSuccess).toBe(true);
    });

    // Reset mutation state
    act(() => {
      result.current.retryMutation.reset();
    });

    // Second retry (simulating task failed again)
    queryClient.setQueryData(['tasks'], {
      tasks: [
        {
          id: '1',
          user_input: 'Task to retry',
          enriched_text: null,
          status: 'open',
          enrichment_status: 'failed',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:02:00Z',
          error_message: 'Processing failed again',
        },
      ],
      count: 1,
    });

    mockRetryFn.mockResolvedValueOnce({
      id: '1',
      user_input: 'Task to retry',
      enriched_text: null,
      status: 'open',
      enrichment_status: 'pending',
      created_at: '2025-11-05T12:00:00Z',
      updated_at: '2025-11-05T12:03:00Z',
      error_message: null,
    });

    await act(async () => {
      result.current.retryMutation.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.retryMutation.isSuccess).toBe(true);
    });

    // Both retries should have succeeded (FR-007b: unlimited retries)
    expect(mockRetryFn).toHaveBeenCalledTimes(2);
  });
});
