/**
 * TypeScript interfaces matching backend schema (3-table architecture).
 */

/**
 * Todo status (for todos table)
 */
export enum TodoStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Task enrichment processing status (for workbench table)
 */
export enum EnrichmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Task type enum (for metadata display)
 */
export enum TaskType {
  MEETING = 'meeting',
  CALL = 'call',
  EMAIL = 'email',
  REVIEW = 'review',
  DEVELOPMENT = 'development',
  RESEARCH = 'research',
  ADMINISTRATIVE = 'administrative',
  OTHER = 'other',
}

/**
 * Priority enum (for metadata display)
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Core task entity with metadata (tasks table).
 * Status fields are in separate workbench/todos tables.
 */
export interface Task {
  id: string;
  user_input: string;
  enriched_text: string | null;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string

  // Metadata fields (Feature 004) - now stored directly on tasks table
  project: string | null;
  persons: string[]; // JSON array
  task_type: string | null; // Now string instead of enum
  priority: string | null; // Now string instead of enum
  deadline_text: string | null;
  deadline_parsed: string | null; // ISO 8601 datetime
  effort_estimate: number | null; // minutes
  dependencies: string[]; // JSON array
  tags: string[]; // JSON array
  extracted_at: string | null; // ISO 8601 datetime
  requires_attention: boolean;
}

/**
 * Task metadata type alias (for components that only need metadata fields)
 */
export type TaskMetadata = Pick<
  Task,
  | 'project'
  | 'persons'
  | 'task_type'
  | 'priority'
  | 'deadline_text'
  | 'deadline_parsed'
  | 'effort_estimate'
  | 'dependencies'
  | 'tags'
  | 'extracted_at'
  | 'requires_attention'
>

/**
 * Workbench entry (enrichment workflow)
 */
export interface WorkbenchEntry {
  id: string;
  task_id: string;
  enrichment_status: EnrichmentStatus;
  error_message: string | null;
  metadata_suggestions: string | null; // JSON string
  moved_to_todos_at: string | null; // ISO 8601 datetime
  created_at: string;
  updated_at: string;
}

/**
 * Todo entry (execution workflow)
 */
export interface TodoEntry {
  id: string;
  task_id: string;
  status: TodoStatus;
  position: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Task with workbench data (for workbench lanes)
 */
export interface WorkbenchTask extends Task {
  workbench: WorkbenchEntry;
}

/**
 * Task with todo data (for todo/project/persons/agenda views)
 */
export interface TodoTask extends Task {
  todo: TodoEntry;
}

/**
 * Request payload for creating a task
 */
export interface CreateTaskRequest {
  user_input: string;
}

/**
 * Response from task creation
 */
export interface CreateTaskResponse {
  task: Task;
  workbench: WorkbenchEntry;
}

/**
 * Response from listing workbench tasks (for workbench lanes)
 */
export interface ListWorkbenchTasksResponse {
  tasks: WorkbenchTask[];
  count: number;
}

/**
 * Response from listing todo tasks (for todo/project/persons/agenda views)
 */
export interface ListTodoTasksResponse {
  tasks: TodoTask[];
  count: number;
}

/**
 * Message types for chat history (User Story 3)
 */
export enum MessageType {
  USER_MESSAGE = 'user_message',
  SYSTEM_CONFIRMATION = 'system_confirmation',
}

/**
 * Chat message entity (User Story 3)
 */
export interface Message {
  id: string;
  content: string;
  timestamp: string;
  type: MessageType;
}
