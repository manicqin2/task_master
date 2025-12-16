/**
 * Navigation Component
 *
 * Top navigation bar with tab-style buttons for main app sections.
 * Based on Figma design at node-id=1:5
 *
 * @feature UI Enhancement - Navigation
 */

import React from 'react'
import { LayoutDashboard, ListChecks, FolderKanban, Users, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavigationTab = 'workbench' | 'todos' | 'projects' | 'persons' | 'agenda'

export interface NavigationProps {
  /**
   * Currently active tab
   */
  activeTab?: NavigationTab

  /**
   * Callback when a tab is clicked
   */
  onTabChange?: (tab: NavigationTab) => void

  /**
   * Additional CSS classes
   */
  className?: string
}

interface TabConfig {
  id: NavigationTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'workbench', label: 'Workbench', icon: LayoutDashboard },
  { id: 'todos', label: 'Todos', icon: ListChecks },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'persons', label: 'Persons', icon: Users },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
]

/**
 * Navigation component - renders tab-style navigation bar
 */
export function Navigation({ activeTab = 'workbench', onTabChange, className }: NavigationProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* App Icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="3" y="3" width="14" height="14" rx="2" />
        </svg>
      </div>

      {/* Tab Bar */}
      <div className="flex-1 bg-gray-100 rounded-2xl h-9 p-1 flex items-center">
        {TAB_CONFIGS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 h-7 rounded-xl transition-colors',
                'text-sm font-medium tracking-tight',
                isActive
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-950 hover:bg-white/50'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
