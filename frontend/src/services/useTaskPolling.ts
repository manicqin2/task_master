/**
 * Custom hook for polling workbench tasks with enrichment status updates
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listWorkbenchTasks } from './api';
import { WorkbenchTask, EnrichmentStatus } from '@/lib/types';

const POLLING_INTERVAL =
  Number(import.meta.env.VITE_POLLING_INTERVAL) || 500; // 500ms default

export function useTaskPolling() {
  const [hasProcessingTasks, setHasProcessingTasks] = useState(false);

  // Query for workbench tasks with conditional polling
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workbench-tasks'],
    queryFn: listWorkbenchTasks,
    refetchInterval: hasProcessingTasks ? POLLING_INTERVAL : false, // Only poll when needed
    refetchIntervalInBackground: true,
  });

  const tasks = data?.tasks || [];

  // Check if any tasks are being enriched
  useEffect(() => {
    const processing = tasks.some(
      (task: WorkbenchTask) =>
        task.workbench.enrichment_status === EnrichmentStatus.PENDING ||
        task.workbench.enrichment_status === EnrichmentStatus.PROCESSING
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
