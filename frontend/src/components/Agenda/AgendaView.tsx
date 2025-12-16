/**
 * AgendaView Component
 *
 * Displays tasks in a calendar/timeline view organized by deadline.
 * Coming soon - placeholder view.
 *
 * @feature Future Enhancement
 */

export interface AgendaViewProps {
  className?: string;
}

/**
 * AgendaView component - placeholder
 */
export function AgendaView({ className = '' }: AgendaViewProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full ${className}`}>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Agenda View</h2>
        <p className="text-gray-600 mb-2">
          View your tasks in a calendar timeline.
        </p>
        <p className="text-sm text-gray-500">
          This feature is coming soon. Tasks will be displayed chronologically
          based on their deadlines and scheduled dates.
        </p>
      </div>
    </div>
  );
}
