/**
 * ProjectsView Component
 *
 * Displays tasks organized by project.
 * Coming soon - placeholder view.
 *
 * @feature Future Enhancement
 */

export interface ProjectsViewProps {
  className?: string;
}

/**
 * ProjectsView component - placeholder
 */
export function ProjectsView({ className = '' }: ProjectsViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full ${className}`}>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Projects View</h2>
        <p className="text-gray-600 mb-2">
          View and organize your tasks by project.
        </p>
        <p className="text-sm text-gray-500">
          This feature is coming soon. Tasks will be grouped by their assigned project
          for better organization.
        </p>
      </div>
    </div>
  );
}
