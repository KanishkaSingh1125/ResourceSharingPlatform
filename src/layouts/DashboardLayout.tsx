import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Shield,
  History,
  ShieldAlert,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { getMyUnreadNotificationCount, NOTIFICATIONS_UPDATED_EVENT } from '@/lib/notificationService'

const sidebarLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/dashboard/discover', icon: Search, label: 'Discover' },
  { to: '/dashboard/bookings', icon: CalendarDays, label: 'My Bookings' },
  { to: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { to: '/dashboard/trust', icon: Shield, label: 'Trust Passport' },
  { to: '/dashboard/activity', icon: History, label: 'Activity history' },
  { to: '/dashboard/safety', icon: ShieldAlert, label: 'Safety report' },
  { to: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
] as const

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const { signOut, profile, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const result = await getMyUnreadNotificationCount()
      if (active) setUnreadCount(result.count)
    }
    void refresh()
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
    return () => {
      active = false
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh)
    }
  }, [user?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold text-neutral-900">
              ShareSphere
            </span>
          </Link>
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* User info */}
        {profile && (
          <div className="border-b border-neutral-200 px-6 py-3">
            <p className="truncate text-sm font-medium text-neutral-800">
              {profile.display_name || 'User'}
            </p>
            <p className="truncate text-xs text-neutral-500">{profile.email}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
              {to === '/dashboard/notifications' && unreadCount !== null && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700" aria-label={`${unreadCount} unread`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-neutral-200 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5 text-neutral-500" />
          </button>
          <span className="text-lg font-semibold text-neutral-900">ShareSphere</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
