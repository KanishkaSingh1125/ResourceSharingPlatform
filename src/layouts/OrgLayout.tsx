import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2,
  Package,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { getMyOrganisations } from '@/features/organisations'
import type { OrgLayoutContext, OrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import { Button } from '@/components/ui'

const sidebarLinks = [
  { to: '/org', icon: Building2, label: 'Workspace' },
  { to: '/org/resources', icon: Package, label: 'Resources' },
  { to: '/org/bookings', icon: CalendarDays, label: 'Booking Requests' },
  { to: '/org/members', icon: Users, label: 'Members' },
  { to: '/org/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/org/credentials', icon: ShieldCheck, label: 'Shared credentials' },
  { to: '/org/incidents', icon: AlertTriangle, label: 'Incidents & holds' },
  { to: '/org/check-in', icon: QrCode, label: 'Check-in / out' },
  { to: '/org/settings', icon: Settings, label: 'Settings' },
] as const

export function OrgLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [organisations, setOrganisations] = useState<OrgWorkspace[]>([])
  const [activeOrganisationId, setActiveOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getMyOrganisations().then(result => {
      if (!active) return
      if (result.error) {
        setError(result.error)
        setOrganisations([])
        setActiveOrganisationId('')
      } else {
        const available = result.data as OrgWorkspace[]
        setOrganisations(available)
        setActiveOrganisationId(current =>
          available.some(org => org.id === current) ? current : available[0]?.id ?? '',
        )
      }
      setLoading(false)
    }).catch(loadError => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'Could not load organisations.')
      setOrganisations([])
      setLoading(false)
    })
    return () => { active = false }
  }, [user?.id])

  const activeOrganisation = organisations.find(org => org.id === activeOrganisationId) ?? null
  const outletContext: OrgLayoutContext = {
    organisations,
    activeOrganisation,
    setActiveOrganisationId,
    loading,
    error,
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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

        <div className="border-b border-neutral-200 px-6 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Organisation
          </p>
          {organisations.length > 1 ? (
            <label className="mt-1 block">
              <span className="sr-only">Active organisation</span>
              <select
                value={activeOrganisationId}
                onChange={event => setActiveOrganisationId(event.target.value)}
                className="w-full truncate rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {organisations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-0.5 truncate text-sm font-medium text-neutral-800">
              {activeOrganisation?.name ?? (loading ? 'Loading…' : 'No organisation selected')}
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/org'}
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
            </NavLink>
          ))}
        </nav>

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

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5 text-neutral-500" />
          </button>
          <span className="truncate text-lg font-semibold text-neutral-900">{activeOrganisation?.name ?? 'Organisation'}</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          {!loading && !error && organisations.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-6">
              <h1 className="text-xl font-semibold text-neutral-900">No organisation workspace</h1>
              <p className="mt-2 text-sm text-neutral-600">
                You need to belong to an organisation to use these tools.
              </p>
              <Link to="/register-org" className="mt-4 inline-flex">
                <Button>Register an organisation</Button>
              </Link>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Could not load your organisation workspaces: {error}
            </div>
          ) : (
            <Outlet context={outletContext} />
          )}
        </main>
      </div>
    </div>
  )
}
