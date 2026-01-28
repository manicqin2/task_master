/**
 * Task sorting utilities
 * Feature 008: Task Management UI Enhancements
 */

type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

const PRIORITY_ORDER: Record<Priority, number> = {
  'Urgent': 0,
  'High': 1,
  'Normal': 2,
  'Low': 3,
};

interface Task {
  priority?: Priority | null;
  deadline?: string | null;
  [key: string]: any;
}

/**
 * Sort tasks by priority first, then by deadline within same priority
 * Nulls deadlines appear last within their priority group
 *
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks (does not mutate original)
 */
export function sortTasksByPriorityAndDeadline<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Primary sort: Priority (Urgent > High > Normal > Low)
    const priorityA = PRIORITY_ORDER[a.priority ?? 'Low'];
    const priorityB = PRIORITY_ORDER[b.priority ?? 'Low'];

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }

    // Secondary sort: Deadline (ascending, nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;  // a goes after b
    if (!b.deadline) return -1; // b goes after a

    return a.deadline.localeCompare(b.deadline); // ISO date string comparison
  });
}
