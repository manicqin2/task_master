/**
 * Task Metadata Types
 *
 * TypeScript definitions for task metadata extracted from natural language descriptions
 */

export type TaskType =
  | 'meeting'
  | 'call'
  | 'email'
  | 'review'
  | 'development'
  | 'research'
  | 'administrative'
  | 'other';

export type Priority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export interface TaskMetadata {
  project: string | null;
  persons: string[];
  task_type: TaskType | null;
  priority: Priority | null;
  deadline_text: string | null;
  deadline_parsed: string | null; // ISO 8601 datetime
  effort_estimate: number | null; // minutes
  dependencies: string[];
  tags: string[];
  extracted_at: string | null; // ISO 8601 datetime
  requires_attention: boolean;
  suggestions?: FieldSuggestions;
}

export interface FieldSuggestion {
  value: string | string[] | null;
  confidence: number; // 0.0-1.0
  alternatives?: string[];
}

export interface FieldSuggestions {
  [fieldName: string]: FieldSuggestion;
}

export interface MetadataExtractionResponse {
  project: string | null;
  project_confidence: number;
  persons: string[];
  persons_confidence: number;
  deadline: string | null;
  deadline_confidence: number;
  task_type: TaskType | null;
  task_type_confidence: number;
  priority: Priority | null;
  priority_confidence: number;
  effort_estimate: number | null;
  effort_confidence: number;
  dependencies: string[];
  dependencies_confidence: number;
  tags: string[];
  tags_confidence: number;
  chain_of_thought?: string;
}

export interface TaskWithMetadata {
  id: string;
  user_input: string;
  enriched_text: string | null;
  enrichment_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  metadata: TaskMetadata | null;
}
