/**
 * Integration Test: Polling Integration
 * Feature 003: Multi-Lane Task Workflow
 *
 * T101: Polling updates task status after backend changes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '../../src/hooks/useTasks';
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

describe('Polling Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchInterval: 500, // Fast polling for tests
        },
      },
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

  it('should poll for task updates and detect status changes', async () => {
    // Initial response: task in pending
    const mockListFn = taskApi.list as ReturnType<typeof vi.fn>;
    mockListFn.mockResolvedValueOnce({
      tasks: [
        {
          id: '1',
          user_input: 'Polling test task',
          enriched_text: null,
          status: 'open',
          enrichment_status: 'pending',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:00:00Z',
          error_message: null,
        },
      ],
      count: 1,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.tasks[0].enrichment_status).toBe('pending');

    // Second poll: task completed
    mockListFn.mockResolvedValueOnce({
      tasks: [
        {
          id: '1',
          user_input: 'Polling test task',
          enriched_text: 'Enriched!',
          status: 'open',
          enrichment_status: 'completed',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:01:00Z',
          error_message: null,
        },
      ],
      count: 1,
    });

    // Wait for polling to update
    await waitFor(
      () => {
        expect(result.current.data?.tasks[0].enrichment_status).toBe('completed');
      },
      { timeout: 2000 }
    );

    // Verify polling happened multiple times
    expect(mockListFn).toHaveBeenCalledTimes(2);
  });

  it('should continue polling after mutations', async () => {
    const mockListFn = taskApi.list as ReturnType<typeof vi.fn>;

    // Set up continuous polling responses
    mockListFn.mockResolvedValue({
      tasks: [],
      count: 0,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const initialCallCount = mockListFn.mock.calls.length;

    // Wait for more polls
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Should have polled multiple times
    expect(mockListFn.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should handle polling errors gracefully', async () => {
    const mockListFn = taskApi.list as ReturnType<typeof vi.fn>;

    // First poll succeeds
    mockListFn.mockResolvedValueOnce({
      tasks: [
        {
          id: '1',
          user_input: 'Test task',
          enriched_text: null,
          status: 'open',
          enrichment_status: 'pending',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:00:00Z',
          error_message: null,
        },
      ],
      count: 1,
    });

    // Second poll fails
    mockListFn.mockRejectedValueOnce(new Error('Network error'));

    // Third poll succeeds
    mockListFn.mockResolvedValueOnce({
      tasks: [
        {
          id: '1',
          user_input: 'Test task',
          enriched_text: null,
          status: 'open',
          enrichment_status: 'pending',
          created_at: '2025-11-05T12:00:00Z',
          updated_at: '2025-11-05T12:00:00Z',
          error_message: null,
        },
      ],
      count: 1,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper });

    // Should still have data despite error in between polls
    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 3000 }
    );
  });
});
