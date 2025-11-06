/**
 * PersonAvatars Component
 *
 * Displays person names as avatars with initials.
 * Feature 004: Task Metadata Extraction - Phase 3 User Story 1
 */

export interface PersonAvatarsProps {
  persons: string[]
  maxVisible?: number
}

/**
 * Get initials from a person's name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'

  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() || '?'
  }

  // First and last name initials
  const firstInit = parts[0]?.charAt(0) || ''
  const lastInit = parts[parts.length - 1]?.charAt(0) || ''
  return (firstInit + lastInit).toUpperCase()
}

/**
 * Get a consistent color for a person based on their name
 */
function getPersonColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ]

  // Simple hash function for consistent color assignment
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * PersonAvatars component
 */
export function PersonAvatars({ persons, maxVisible = 3 }: PersonAvatarsProps) {
  if (!persons || persons.length === 0) {
    return null
  }

  const visiblePersons = persons.slice(0, maxVisible)
  const remainingCount = persons.length - maxVisible

  return (
    <div className="flex items-center gap-1 mt-2" data-testid="person-avatars">
      {visiblePersons.map((person, index) => (
        <div
          key={person}
          className={`
            flex items-center justify-center
            w-8 h-8 rounded-full
            text-white text-xs font-semibold
            ${getPersonColor(person)}
            shadow-sm
          `}
          title={person}
          data-testid={`person-avatar-${index}`}
        >
          {getInitials(person)}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className="
            flex items-center justify-center
            w-8 h-8 rounded-full
            bg-gray-400 text-white text-xs font-semibold
            shadow-sm
          "
          title={`${remainingCount} more`}
          data-testid="person-overflow"
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
