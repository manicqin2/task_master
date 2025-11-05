/**
 * TaskItem component - Displays a single task with enrichment status
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Task, EnrichmentStatus } from '@/lib/types';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  // Show loading state while enrichment is pending or processing
  if (
    task.enrichment_status === EnrichmentStatus.PENDING ||
    task.enrichment_status === EnrichmentStatus.PROCESSING
  ) {
    return (
      <Card className="mb-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if enrichment failed (FR-018)
  if (task.enrichment_status === EnrichmentStatus.FAILED) {
    return (
      <Card className="mb-2 border-destructive">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                [Enrichment failed]
              </p>
              {task.error_message && (
                <p className="text-xs text-muted-foreground mt-1">
                  {task.error_message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show enriched task (completed state)
  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        <p className="text-sm">{task.enriched_text || task.user_input}</p>
      </CardContent>
    </Card>
  );
}
