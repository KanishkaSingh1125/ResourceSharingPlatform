import { type ReactNode } from 'react'
import { Menu, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NotificationDropdown } from './NotificationDropdown'
import { UserProfileMenu } from './UserProfileMenu'
import { useRole } from '@/context'

export interface DashboardHeaderProps {
  onToggleSidebar: () => void
  title?: string
  searchPlaceholder?: string
  onSearchClick?: () => void
  actions?: ReactNode
}

export function DashboardHeader({
  onToggleSidebar,
  title,
  searchPlaceholder = 'Quick search resources, bookings (⌘K)...',
  onSearchClick,
  actions,
}: DashboardHeaderProps) {
  const { roleMeta } = useRole()
  const displayTitle = title || roleMeta.label

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden transition-colors shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="text-sm font-bold text-neutral-900 lg:hidden truncate">
          {displayTitle}
        </span>

        {/* Desktop Quick Search Trigger */}
        <div
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-300 hover:bg-neutral-100/70 transition-colors cursor-pointer w-64 lg:w-80 shrink-0"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{searchPlaceholder}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {actions}

        {/* Quick Link to UI Kit */}
        <Link
          to="/design-system"
          className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
          title="Explore Design System Tokens & Components"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span>Design System</span>
        </Link>

        {/* Notifications */}
        <NotificationDropdown />

        <div className="h-4 w-px bg-neutral-200" />

        {/* User profile dropdown with role switcher */}
        <div className="w-auto">
          <UserProfileMenu isCollapsed={false} align="bottom" />
        </div>
      </div>
    </header>
  )
}
