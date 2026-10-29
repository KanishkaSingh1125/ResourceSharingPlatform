import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui'
import { type NavigationItem } from '@/types/navigation'

interface SidebarItemProps {
  item: NavigationItem
  isCollapsed: boolean
  onNavigate?: () => void
}

export function SidebarItem({ item, isCollapsed, onNavigate }: SidebarItemProps) {
  const location = useLocation()
  const Icon = item.icon
  const hasChildren = Boolean(item.children && item.children.length > 0)

  // Check if current route matches this item or any of its children
  const isParentActive =
    location.pathname === item.to ||
    (item.children && item.children.some((c) => location.pathname.startsWith(c.to.split('#')[0])))

  const [isOpen, setIsOpen] = useState(isParentActive)
  const [showTooltip, setShowTooltip] = useState(false)

  // If item has children and is expanded
  if (hasChildren && !isCollapsed) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            isParentActive
              ? 'bg-neutral-100 text-neutral-900 font-semibold'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className="h-4 w-4 shrink-0 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
            <span className="truncate">{item.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {item.badge && (
              <Badge variant={item.badge.variant || 'default'} size="sm">
                {item.badge.text}
              </Badge>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {isOpen && (
          <div className="mt-1 space-y-0.5 pl-7 pr-1">
            {item.children?.map((sub) => {
              const isSubActive = location.pathname === sub.to.split('#')[0]

              return (
                <NavLink
                  key={sub.id}
                  to={sub.to}
                  onClick={onNavigate}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    isSubActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900'
                  }`}
                >
                  <span className="truncate">{sub.label}</span>
                  {sub.badge && (
                    <Badge variant={sub.badge.variant || 'default'} size="sm">
                      {sub.badge.text}
                    </Badge>
                  )}
                </NavLink>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Collapsed mode with floating tooltip
  if (isCollapsed) {
    return (
      <div
        className="relative flex justify-center w-full"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <NavLink
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isActive
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            }`
          }
          aria-label={item.label}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {item.badge && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
            </span>
          )}
        </NavLink>

        {/* Floating Tooltip */}
        {showTooltip && (
          <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-neutral-200 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2">
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[10px] text-neutral-300">
                  {item.badge.text}
                </span>
              )}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute right-full top-1/2 -mt-1 -mr-px border-4 border-transparent border-r-neutral-900" />
          </div>
        )}
      </div>
    )
  }

  // Standard expanded item
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs'
            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
        }`
      }
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
        <span className="truncate">{item.label}</span>
      </div>

      {item.badge && (
        <Badge variant={item.badge.variant as BadgeVariant || 'default'} size="sm">
          {item.badge.text}
        </Badge>
      )}
    </NavLink>
  )
}
