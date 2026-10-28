import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, HelpCircle, Settings, Sparkles } from 'lucide-react'
import { SidebarItem } from './SidebarItem'
import { UserProfileMenu } from './UserProfileMenu'
import { useRole } from '@/context'
import { type NavigationItem } from '@/types/navigation'

export interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
}

const sectionTitles: Record<string, string> = {
  main: 'Overview',
  management: 'Resources & Requests',
  compliance: 'Analytics & Compliance',
  system: 'Preferences',
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const { navItems, roleMeta } = useRole()
  const location = useLocation()

  // Close automatically on route changes
  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Group nav items
  const sections = navItems.reduce<Record<string, NavigationItem[]>>((acc, item) => {
    const sec = item.section || 'main'
    if (!acc[sec]) acc[sec] = []
    acc[sec].push(item)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-xs">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-neutral-900 leading-tight">
                ShareSphere
              </span>
              <span className="text-[10px] font-medium text-neutral-400">
                Multi-Organisation Sharing
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Indicator Pill */}
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700">
            {roleMeta.label}
          </span>
          <Link
            to="/design-system"
            onClick={onClose}
            className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800 font-medium"
          >
            <Sparkles className="h-3 w-3" />
            <span>UI Kit</span>
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.entries(sections).map(([sectionKey, items]) => (
            <div key={sectionKey} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                {sectionTitles[sectionKey] || sectionKey}
              </p>

              <div className="space-y-1">
                {items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    isCollapsed={false}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom utility & user profile */}
        <div className="border-t border-neutral-200 p-3 bg-neutral-50/50 space-y-2">
          <SidebarItem
            item={{
              id: 'mobile-help',
              label: 'Help & Support',
              to: '/help',
              icon: HelpCircle,
              roles: ['member', 'manager', 'org_admin', 'platform_admin'],
            }}
            isCollapsed={false}
            onNavigate={onClose}
          />

          <SidebarItem
            item={{
              id: 'mobile-settings',
              label: 'Settings',
              to: roleMeta.homePath === '/admin' ? '/admin/settings' : '/dashboard/settings',
              icon: Settings,
              roles: ['member', 'manager', 'org_admin', 'platform_admin'],
            }}
            isCollapsed={false}
            onNavigate={onClose}
          />

          <hr className="border-neutral-200 my-1" />

          <UserProfileMenu isCollapsed={false} />
        </div>
      </div>
    </div>
  )
}
