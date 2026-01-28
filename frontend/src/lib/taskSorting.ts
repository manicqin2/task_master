/**
 * Task sorting utilities
 * Feature 008: Task Management UI Enhancements
 */

// Priority order lookup (lowercase keys for case-insensitive matching)
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Get priority order value (case-insensitive)
 */
function getPriorityOrder(priority: string | null | undefined): number {
  return PRIORITY_ORDER[(priority ?? 'low').toLowerCase()] ?? 3;
}

// Task interface matching actual schema fields
interface SortableTask {
  priority?: string | null;
  deadline_text?: string | null;   // ISO date from user input
  deadline_parsed?: string | null; // ISO datetime from parsing
  [key: string]: any;
}

/**
 * Get effective deadline for sorting (prefer parsed, fallback to text)
 */
function getEffectiveDeadline(task: SortableTask): string | null {
  // Use deadline_parsed if available (ISO datetime)
  if (task.deadline_parsed) {
    return task.deadline_parsed.split('T')[0]; // Extract date portion
  }
  // Fallback to deadline_text (should be ISO date)
  return task.deadline_text || null;
}

/**
 * Sort tasks by priority first, then by deadline within same priority
 * Null deadlines appear last within their priority group
 *
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks (does not mutate original)
 */
export function sortTasksByPriorityAndDeadline<T extends SortableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Primary sort: Priority (Urgent > High > Normal > Low), case-insensitive
    const priorityA = getPriorityOrder(a.priority);
    const priorityB = getPriorityOrder(b.priority);

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }

    // Secondary sort: Deadline (ascending, nulls last)
    const deadlineA = getEffectiveDeadline(a);
    const deadlineB = getEffectiveDeadline(b);

    if (!deadlineA && !deadlineB) return 0;
    if (!deadlineA) return 1;  // a goes after b
    if (!deadlineB) return -1; // b goes after a

    return deadlineA.localeCompare(deadlineB); // ISO date string comparison
  });
}
