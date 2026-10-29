import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BarChart3, CalendarDays, Package, Wrench } from 'lucide-react'
import { Card } from '@/components/ui'
import { getOrgPendingBookings } from '@/features/bookings'
import { getOrgResources } from '@/features/resources'
import { getOrgMembers } from '@/features/organisations'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import { supabase } from '@/lib/supabase'

interface WorkspaceSummary {
  resources: number
  published: number
  pendingBookings: number
  members: number
  activeWaitlist: number
  activeMaintenance: number
  openIncidents: number
}

export function OrgWorkspace() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [resourceResult, bookingResult, memberResult] = await Promise.all([
      getOrgResources(activeOrganisation.id),
      getOrgPendingBookings(activeOrganisation.id),
      getOrgMembers(activeOrganisation.id),
    ])
    const failures = [resourceResult.error, bookingResult.error, memberResult.error].filter(Boolean)
    if (failures.length) {
      setError(failures.join(' '))
      setSummary(null)
      setLoading(false)
      return
    }
    const resourceIds = resourceResult.data.map(resource => resource.id)
    if (resourceIds.length === 0) {
      setSummary({
        resources: 0,
        published: 0,
        pendingBookings: bookingResult.data.length,
        members: memberResult.data.length,
        activeWaitlist: 0,
        activeMaintenance: 0,
        openIncidents: 0,
      })
      setLoading(false)
      return
    }
    const now = new Date().toISOString()
    const [waitlistResult, maintenanceResult, incidentResult] = await Promise.all([
      supabase.from('waiting_list').select('id', { count: 'exact', head: true })
        .in('resource_id', resourceIds).in('status', ['waiting', 'offered']),
      supabase.from('maintenance_blocks').select('id', { count: 'exact', head: true })
        .in('resource_id', resourceIds).gte('ends_at', now),
      supabase.from('incidents').select('id', { count: 'exact', head: true })
        .in('resource_id', resourceIds).in('status', ['open', 'investigating']),
    ])
    const relatedErrors = [waitlistResult.error, maintenanceResult.error, incidentResult.error]
      .filter(Boolean).map(item => item?.message)
    if (relatedErrors.length) {
      setError(relatedErrors.join(' '))
      setSummary(null)
    } else {
      setSummary({
        resources: resourceResult.data.length,
        published: resourceResult.data.filter(resource => resource.publication_status === 'published').length,
        pendingBookings: bookingResult.data.length,
        members: memberResult.data.length,
        activeWaitlist: waitlistResult.count ?? 0,
        activeMaintenance: maintenanceResult.count ?? 0,
        openIncidents: incidentResult.count ?? 0,
      })
    }
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation workspace.'}</p>
  }

  const metrics = summary ? [
    { label: 'Resources', value: `${summary.published} published / ${summary.resources} total`, icon: Package, to: '/org/resources' },
    { label: 'Pending approvals', value: summary.pendingBookings, icon: CalendarDays, to: '/org/bookings' },
    { label: 'Active waitlist entries', value: summary.activeWaitlist, icon: CalendarDays },
    { label: 'Upcoming maintenance blocks', value: summary.activeMaintenance, icon: Wrench, to: '/org/resources' },
    { label: 'Open incidents', value: summary.openIncidents, icon: AlertCircle, to: '/org/incidents' },
    { label: 'Organisation members', value: summary.members, icon: BarChart3, to: '/org/members' },
  ] : []

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{activeOrganisation.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">Organisation workspace overview. Counts come from current backend records.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={loading}>
        {loading ? <Card className="text-sm text-neutral-600">Loading organisation summary…</Card> : error ? (
          <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-800">
            <p className="font-semibold">Could not load the workspace summary</p><p className="mt-1">{error}</p>
          </Card>
        ) : metrics.map(metric => {
          const Icon = metric.icon
          const content = (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
                <p className="mt-2 text-xl font-bold text-neutral-900">{metric.value}</p>
              </div>
              <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            </div>
          )
          return metric.to ? (
            <Link key={metric.label} to={metric.to} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <Card className="h-full transition-shadow hover:shadow-md">{content}</Card>
            </Link>
          ) : (
            <Card key={metric.label} className="h-full">{content}</Card>
          )
        })}
      </div>
      {!loading && !error && (
        <Card className="mt-5">
          <h2 className="font-semibold text-neutral-900">Next steps</h2>
          <ul className="mt-3 flex flex-wrap gap-4 text-sm">
            <li><Link className="text-brand-700 underline" to="/org/resources">Manage resources</Link></li>
            <li><Link className="text-brand-700 underline" to="/org/bookings">Review booking requests</Link></li>
            <li><Link className="text-brand-700 underline" to="/org/analytics">View measured sharing analytics</Link></li>
          </ul>
        </Card>
      )}
    </div>
  )
}
