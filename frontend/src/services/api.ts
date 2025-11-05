/**
 * API service for task operations.
 */
import { get, post } from '@/lib/api-client';
import {
  CreateTaskRequest,
  CreateTaskResponse,
  ListTasksResponse,
  Task,
} from '@/lib/types';

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
 * List all tasks
 */
export async function listTasks(): Promise<ListTasksResponse> {
  return await get<ListTasksResponse>('/tasks');
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  return await get<Task>(`/tasks/${taskId}`);
}
