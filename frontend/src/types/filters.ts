/**
 * Task filtering types
 * Feature 008: Task Management UI Enhancements
 */

/**
 * Task filter criteria for different tab views
 *
 * - No filter (undefined): Shows all tasks (Todos tab)
 * - project: Filter by project name (Projects tab)
 * - deadline: Filter by specific deadline date (Agenda tab)
 * - person: Filter by assigned person (Persons tab)
 */
export interface TaskFilter {
  project?: string;       // Filter by project name
  deadline?: string;      // Filter by deadline date (ISO format YYYY-MM-DD)
  person?: string;        // Filter by assigned person
}
