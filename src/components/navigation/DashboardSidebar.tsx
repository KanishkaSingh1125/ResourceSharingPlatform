import { type ReactNode, type ElementType } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { X, LogOut } from 'lucide-react'

export interface NavItem {
  to: string
  icon: ElementType
  label: string
  badge?: string | number
  end?: boolean
}

export interface DashboardSidebarProps {
  brandTitle: string
  brandSubtitle?: string
  brandBadge?: ReactNode
  brandLink?: string
  logoBg?: string
  navItems: NavItem[]
  isOpen: boolean
  onClose: () => void
  onSignOut?: () => void
  footerSlot?: ReactNode
}

export function DashboardSidebar({
  brandTitle,
  brandSubtitle,
  brandBadge,
  brandLink = '/',
  logoBg = 'bg-brand-600',
  navItems,
  isOpen,
  onClose,
  onSignOut,
  footerSlot,
}: DashboardSidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
          <Link to={brandLink} className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-xs ${logoBg}`}
            >
              {brandTitle.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-neutral-900 leading-tight">
                {brandTitle}
              </span>
              {brandSubtitle && (
                <span className="text-[11px] font-medium text-neutral-400">
                  {brandSubtitle}
                </span>
              )}
            </div>
          </Link>

          <button
            type="button"
            className="lg:hidden rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {brandBadge && (
          <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-2.5">
            {brandBadge}
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, icon: Icon, label, badge, end = false }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </div>

              {badge !== undefined && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Footer Section */}
        <div className="border-t border-neutral-200 p-3 space-y-1">
          {footerSlot}

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

