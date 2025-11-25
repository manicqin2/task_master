/**
 * ActionEmblem Component
 *
 * Reusable button component for task actions (cancel, retry, confirm, expand).
 * Displays an icon button with tooltip support.
 *
 * @feature 003-task-lane-workflow
 * @phase Phase 4 - User Story 2 (Cancel Action in Pending Lane)
 */

import React from 'react'
import { X, RotateCw, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { ActionEmblem as ActionEmblemType } from '@/types/task'

export interface ActionEmblemProps {
  /**
   * The type of action this emblem represents
   */
  type: ActionEmblemType

  /**
   * Tooltip text to show on hover
   */
  tooltip: string

  /**
   * Callback fired when the emblem is clicked
   */
  onClick: () => void

  /**
   * Visual variant of the button
   */
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary'

  /**
   * Size of the emblem
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether the emblem is disabled
   */
  disabled?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string

  /**
   * Loading state (shows spinner)
   */
  loading?: boolean

  /**
   * Optional custom icon name (overrides default icon for type)
   * Supported: 'X', 'RotateCw', 'Check', 'ChevronDown', 'ChevronUp'
   */
  icon?: string
}

/**
 * Get the icon component by name
 */
function getIconByName(iconName: string) {
  switch (iconName) {
    case 'X':
      return X
    case 'RotateCw':
      return RotateCw
    case 'Check':
      return Check
    case 'ChevronDown':
      return ChevronDown
    case 'ChevronUp':
      return ChevronUp
    default:
      return X
  }
}

/**
 * Get the icon component for the action type
 */
function getIcon(type: ActionEmblemType) {
  switch (type) {
    case 'cancel':
      return X
    case 'retry':
      return RotateCw
    case 'confirm':
      return Check
    case 'expand':
      return ChevronDown
    default:
      return X
  }
}

/**
 * Get the button variant styles
 */
function getVariantStyles(variant: string = 'ghost') {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

  switch (variant) {
    case 'default':
      return `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400`
    case 'destructive':
      return `${base} bg-red-600 text-white hover:bg-red-700 focus:ring-red-400`
    case 'outline':
      return `${base} border border-gray-300 bg-transparent hover:bg-gray-100 focus:ring-gray-400`
    case 'secondary':
      return `${base} bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400`
    case 'ghost':
    default:
      return `${base} hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400`
  }
}

/**
 * Get the size styles
 */
function getSizeStyles(size: string = 'sm') {
  switch (size) {
    case 'lg':
      return 'h-10 w-10'
    case 'md':
      return 'h-8 w-8'
    case 'sm':
    default:
      return 'h-6 w-6 p-1'
  }
}

/**
 * ActionEmblem component
 */
export const ActionEmblem: React.FC<ActionEmblemProps> = ({
  type,
  tooltip,
  onClick,
  variant = 'ghost',
  size = 'sm',
  disabled = false,
  className = '',
  ariaLabel,
  loading = false,
  icon,
}) => {
  // Use custom icon if provided, otherwise use default for type
  const Icon = icon ? getIconByName(icon) : getIcon(type)
  const variantStyles = getVariantStyles(variant)
  const sizeStyles = getSizeStyles(size)

  return (
    <button
      type="button"
      className={`${variantStyles} ${sizeStyles} ${className} group relative`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || tooltip}
      title={tooltip} // Fallback for browsers without CSS hover
      data-tooltip={tooltip}
    >
      <Icon
        className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'} ${
          loading ? 'animate-spin' : ''
        }`}
      />
      {/* CSS-based tooltip with consistent styling (T123) and 500ms delay (T125) */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 delay-500 whitespace-nowrap z-50">
        {tooltip}
      </span>
    </button>
  )
}

ActionEmblem.displayName = 'ActionEmblem'
