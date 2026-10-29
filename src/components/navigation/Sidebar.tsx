import { Link } from 'react-router-dom'
import {
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  Settings,
  Sparkles,
} from 'lucide-react'
import { SidebarItem } from './SidebarItem'
import { UserProfileMenu } from './UserProfileMenu'
import { useRole } from '@/context'
import { type NavigationItem } from '@/types/navigation'

export interface SidebarProps {
  className?: string
}

const sectionTitles: Record<string, string> = {
  main: 'Overview',
  management: 'Resources & Requests',
  compliance: 'Analytics & Compliance',
  system: 'Preferences',
}

export function Sidebar({ className = '' }: SidebarProps) {
  const { isCollapsed, toggleCollapse, navItems, roleMeta } = useRole()

  // Group nav items by section
  const sections = navItems.reduce<Record<string, NavigationItem[]>>((acc, item) => {
    const sec = item.section || 'main'
    if (!acc[sec]) acc[sec] = []
    acc[sec].push(item)
    return acc
  }, {})

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-neutral-200 bg-white transition-all duration-300 ease-in-out lg:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
      aria-label="Main sidebar navigation"
    >
      {/* ── Brand Header ────────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
        <Link
          to="/"
          className={`flex items-center gap-3 transition-opacity ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
          title="ShareSphere Home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-xs">
            S
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-neutral-900 leading-tight">
                ShareSphere
              </span>
              <span className="text-[10px] font-medium text-neutral-400 truncate">
                Multi-Organisation Sharing
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Role Indicator Pill (Expanded) ──────────────────────── */}
      {!isCollapsed && (
        <div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />
            <span className="text-[11px] font-semibold text-neutral-700 truncate">
              {roleMeta.label}
            </span>
          </div>
          <Link
            to="/design-system"
            className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800 font-medium"
            title="Design System Demo"
          >
            <Sparkles className="h-3 w-3" />
            <span>UI Kit</span>
          </Link>
        </div>
      )}

      {/* ── Scrollable Navigation Items ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5">
        {Object.entries(sections).map(([sectionKey, items]) => (
          <div key={sectionKey} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                {sectionTitles[sectionKey] || sectionKey}
              </p>
            )}

            <div className="space-y-1">
              {items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Section: Help, Settings, & Profile ───────────── */}
      <div className="border-t border-neutral-200 p-3 space-y-2 bg-neutral-50/40">
        <div className="space-y-1">
          <SidebarItem
            item={{
              id: 'help-utility',
              label: 'Help & Support',
              to: '/help',
              icon: HelpCircle,
              roles: ['member', 'manager', 'org_admin', 'platform_admin'],
            }}
            isCollapsed={isCollapsed}
          />

          <SidebarItem
            item={{
              id: 'settings-utility',
              label: 'Settings',
              to: roleMeta.homePath === '/admin' ? '/admin/settings' : '/dashboard/settings',
              icon: Settings,
              roles: ['member', 'manager', 'org_admin', 'platform_admin'],
            }}
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Collapsed Expand Toggle */}
        {isCollapsed && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-800 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        <hr className="border-neutral-200/80 my-1" />

        {/* User Profile Menu */}
        <UserProfileMenu isCollapsed={isCollapsed} />
      </div>
    </aside>
  )
}
