/**
 * TaskList component - Displays list of tasks
 */
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskItem } from './TaskItem';
import { Task } from '@/lib/types';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
}

export function TaskList({ tasks, isLoading = false }: TaskListProps) {
  // Empty state (FR-012)
  if (!isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No open tasks yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </ScrollArea>
  );
}
