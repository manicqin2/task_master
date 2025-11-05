/**
 * Custom hook for polling tasks with enrichment status updates
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTasks } from './api';
import { Task, EnrichmentStatus } from '@/lib/types';

const POLLING_INTERVAL =
  Number(import.meta.env.VITE_POLLING_INTERVAL) || 500; // 500ms default

export function useTaskPolling() {
  const [hasProcessingTasks, setHasProcessingTasks] = useState(false);

  // Query for tasks with conditional polling
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
    refetchInterval: hasProcessingTasks ? POLLING_INTERVAL : false, // Only poll when needed
    refetchIntervalInBackground: true,
  });

  const tasks = data?.tasks || [];

  // Check if any tasks are being enriched
  useEffect(() => {
    const processing = tasks.some(
      (task: Task) =>
        task.enrichment_status === EnrichmentStatus.PENDING ||
        task.enrichment_status === EnrichmentStatus.PROCESSING
    );
    setHasProcessingTasks(processing);
  }, [tasks]);

  return {
    tasks,
    count: data?.count || 0,
    isLoading,
    error,
    refetch,
  };
}
