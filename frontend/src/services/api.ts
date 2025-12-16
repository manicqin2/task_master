/**
 * API service for task operations.
 */
import { get, post, patch, del } from '@/lib/api-client';
import {
  CreateTaskRequest,
  CreateTaskResponse,
  ListWorkbenchTasksResponse,
  ListTodoTasksResponse,
  Task,
  TaskMetadata,
} from '@/lib/types';

/**
 * Request for updating task metadata (Feature 004)
 */
export interface UpdateMetadataRequest {
  project?: string | null;
  persons?: string[];
  task_type?: string | null;
  priority?: string | null;
  deadline_text?: string | null;
  deadline_parsed?: string | null;
  effort_estimate?: number | null;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Create a new task
 */
export async function createTask(
  userInput: string
): Promise<CreateTaskResponse> {
  const request: CreateTaskRequest = { user_input: userInput };
  return await post<CreateTaskResponse, CreateTaskRequest>('/tasks', request);
}

/**
 * List workbench tasks (enrichment workflow)
 *
 * Returns tasks currently in the workbench (not yet moved to todos).
 * Used by LaneWorkflow component to display Pending, More Info, and Ready lanes.
 */
export async function listWorkbenchTasks(): Promise<ListWorkbenchTasksResponse> {
  return await get<ListWorkbenchTasksResponse>('/tasks/workbench');
}

/**
 * List todo tasks (execution workflow)
 *
 * Returns tasks that have been moved to the todo list.
 * Used by Todos, Projects, Persons, and Agenda views.
 */
export async function listTodoTasks(): Promise<ListTodoTasksResponse> {
  return await get<ListTodoTasksResponse>('/tasks/todos');
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  return await get<Task>(`/tasks/${taskId}`);
}

/**
 * Retry a failed task (Feature 003: Multi-Lane Task Workflow)
 *
 * Resets the task's enrichment_status from 'failed' back to 'pending'
 * and re-queues it for processing.
 *
 * @param taskId - The ID of the task to retry
 * @returns The updated task with enrichment_status reset to 'pending'
 */
export async function retryTask(taskId: string): Promise<Task> {
  return await post<Task, {}>(`/tasks/${taskId}/retry`, {});
}

/**
 * Update task metadata (Feature 004: Task Metadata Extraction)
 *
 * Allows users to manually update metadata fields extracted from task descriptions.
 * Used primarily for tasks with low-confidence extractions that require user attention.
 *
 * @param taskId - The ID of the task to update
 * @param metadata - Partial metadata update (only provided fields will be updated)
 * @returns The updated task with new metadata
 */
export async function updateTaskMetadata(
  taskId: string,
  metadata: UpdateMetadataRequest
): Promise<Task> {
  return await patch<Task, UpdateMetadataRequest>(
    `/tasks/${taskId}/metadata`,
    metadata
  );
}

/**
 * Delete a task
 *
 * Used when canceling tasks from the error lane.
 *
 * @param taskId - The ID of the task to delete
 */
export async function deleteTask(taskId: string): Promise<void> {
  await del<void>(`/tasks/${taskId}`);
}

/**
 * Update task status
 *
 * Used to mark tasks as completed or archived in the Todos view.
 *
 * @param taskId - The ID of the task to update
 * @param status - The new status ('open', 'completed', or 'archived')
 * @returns The updated task
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'open' | 'completed' | 'archived'
): Promise<Task> {
  return await patch<Task, { status: string }>(
    `/tasks/${taskId}/status`,
    { status }
  );
}

/**
 * Move task from workbench to todos
 *
 * Moves a task from the Ready lane to the todo list.
 *
 * @param taskId - The ID of the task to move
 * @returns The updated task with todo entry
 */
export async function moveTaskToTodos(taskId: string): Promise<Task> {
  return await post<Task, {}>(`/tasks/${taskId}/move-to-todos`, {});
}
