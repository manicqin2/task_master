/**
 * PersonsView Component
 *
 * Displays tasks organized by person/assignee.
 * Coming soon - placeholder view.
 *
 * @feature Future Enhancement
 */

export interface PersonsViewProps {
  className?: string;
}

/**
 * PersonsView component - placeholder
 */
export function PersonsView({ className = '' }: PersonsViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full ${className}`}>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Persons View</h2>
        <p className="text-gray-600 mb-2">
          View and organize your tasks by person.
        </p>
        <p className="text-sm text-gray-500">
          This feature is coming soon. Tasks will be grouped by the people mentioned
          in them for easy collaboration tracking.
        </p>
      </div>
    </div>
  );
}
