import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { getCurrentProfile } from '@/services/authService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface ResourceSummary {
  id: string
  title: string
  category: string
  availability_status: string
}

interface BookingSummary {
  id: string
  resource_id: string
  status: string
  start_time: string
  end_time: string
  created_at: string
}

interface IncidentSummary {
  id: string
  title: string
  severity: string
  created_at: string
  resource_id: string
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const managerRoles = ['manager', 'org_admin', 'platform_admin']

export function OrgWorkspace() {
  const [resources, setResources] = useState<ResourceSummary[]>([])
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (!isSupabaseConfigured) {
          throw new Error('The organisation dashboard requires a configured backend.')
        }
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw new Error(`Could not verify your session: ${authError.message}`)
        if (!auth.user) throw new Error('Sign in with an authorised organisation account.')
        const profile = await getCurrentProfile()
        if (profile.id !== auth.user.id || !managerRoles.includes(profile.role)) {
          throw new Error('The organisation dashboard is restricted to authorised managers.')
        }

        const [resourcesResult, bookingsResult, incidentsResult] = await Promise.all([
          supabase
            .from('resources')
            .select('id,title,category,availability_status')
            .eq('organisation_id', profile.organisationId)
            .order('title', { ascending: true }),
          supabase
            .from('bookings')
            .select('id,resource_id,status,start_time,end_time,created_at')
            .eq('owner_organisation_id', profile.organisationId)
            .order('created_at', { ascending: false }),
          supabase
            .from('reports_and_incidents')
            .select('id,title,severity,created_at,resource_id')
            .eq('organisation_id', profile.organisationId)
            .eq('type', 'incident_report')
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(5),
        ])
        if (resourcesResult.error) throw new Error(`Could not load organisation resources: ${resourcesResult.error.message}`)
        if (bookingsResult.error) throw new Error(`Could not load organisation bookings: ${bookingsResult.error.message}`)
        if (incidentsResult.error) throw new Error(`Could not load incident alerts: ${incidentsResult.error.message}`)
        if (!active) return
        setResources((resourcesResult.data || []) as ResourceSummary[])
        setBookings((bookingsResult.data || []) as BookingSummary[])
        setIncidents((incidentsResult.data || []) as IncidentSummary[])
      } catch (error) {
        if (active) setErrorText(error instanceof Error ? error.message : 'The organisation dashboard could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const resourceById = new Map(resources.map((resource) => [resource.id, resource]))
  const activeResources = resources.filter((resource) => resource.availability_status === 'available')
  const maintenanceResources = resources.filter((resource) =>
    ['maintenance', 'unavailable'].includes(resource.availability_status)
  )
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
  const upcomingBookings = bookings
    .filter((booking) =>
      ['approved', 'confirmed', 'in_progress'].includes(booking.status) &&
      new Date(booking.end_time).getTime() >= now
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 5)
  const recentBookings = [...bookings]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation workspace"
        subtitle="Current resource and booking records visible to your organisation."
        breadcrumbs={[{ label: 'Organisation' }, { label: 'Workspace' }]}
      />

      {errorText && <Alert variant="error" title="Dashboard unavailable">{errorText}</Alert>}
      {loading ? (
        <Card aria-live="polite"><p className="text-sm text-neutral-600">Loading organisation records…</p></Card>
      ) : errorText ? null : (
        <>
          <section aria-label="Organisation summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Active resources" value={activeResources.length} href="/org/resources" />
            <SummaryCard label="Pending approvals" value={pendingBookings.length} href="/org/bookings" />
            <SummaryCard label="Upcoming bookings" value={upcomingBookings.length} href="/org/bookings" />
            <SummaryCard label="Open incidents" value={incidents.length} href="/org/incidents" />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">Upcoming bookings</h2>
                <Link className="text-sm font-medium text-brand-700 hover:underline" to="/org/bookings">All bookings</Link>
              </div>
              {upcomingBookings.length === 0 ? (
                <EmptyState title="No upcoming bookings" description="Approved future bookings will appear here." compact />
              ) : upcomingBookings.map((booking) => (
                <Card key={booking.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link to={`/dashboard/bookings/${booking.id}`} className="font-medium text-brand-700 hover:underline">
                        {resourceById.get(booking.resource_id)?.title || 'Resource booking'}
                      </Link>
                      <p className="mt-1 text-sm text-neutral-600">{formatDate(booking.start_time)}</p>
                    </div>
                    <Badge variant={booking.status === 'in_progress' ? 'primary' : 'success'}>
                      {booking.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                </Card>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">Pending approval requests</h2>
                <Link className="text-sm font-medium text-brand-700 hover:underline" to="/org/bookings">Review requests</Link>
              </div>
              {pendingBookings.length === 0 ? (
                <EmptyState title="No pending requests" description="New requests for your resources will appear here." compact />
              ) : pendingBookings.slice(0, 5).map((booking) => (
                <Card key={booking.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link to={`/dashboard/bookings/${booking.id}`} className="font-medium text-brand-700 hover:underline">
                        {resourceById.get(booking.resource_id)?.title || 'Resource booking'}
                      </Link>
                      <p className="mt-1 text-sm text-neutral-600">Submitted {formatDate(booking.created_at)}</p>
                    </div>
                    <Badge variant="warning">Pending approval</Badge>
                  </div>
                </Card>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">Maintenance and availability</h2>
                <Link className="text-sm font-medium text-brand-700 hover:underline" to="/org/resources">Manage resources</Link>
              </div>
              {maintenanceResources.length === 0 ? (
                <EmptyState title="No resource holds" description="No resource is currently marked unavailable or under maintenance." compact />
              ) : maintenanceResources.map((resource) => (
                <Card key={resource.id}>
                  <div className="flex items-center justify-between gap-3">
                    <Link to="/org/resources" className="font-medium text-brand-700 hover:underline">{resource.title}</Link>
                    <Badge variant={resource.availability_status === 'maintenance' ? 'warning' : 'error'}>
                      {resource.availability_status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                </Card>
              ))}
              {incidents.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-neutral-900">Open incident reports</h3>
                  <ul className="mt-2 space-y-2">
                    {incidents.map((incident) => (
                      <li key={incident.id} className="flex flex-wrap justify-between gap-2 text-sm">
                        <Link to="/org/incidents" className="text-brand-700 hover:underline">{incident.title}</Link>
                        <span className="text-neutral-500">{incident.severity} · {formatDate(incident.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">Recent booking submissions</h2>
                <Link className="text-sm font-medium text-brand-700 hover:underline" to="/org/bookings">Booking history</Link>
              </div>
              {recentBookings.length === 0 ? (
                <EmptyState title="No booking activity" description="Persisted booking submissions will appear here." compact />
              ) : (
                <Card>
                  <ul className="divide-y divide-neutral-100">
                    {recentBookings.map((booking) => (
                      <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div>
                          <Link to={`/dashboard/bookings/${booking.id}`} className="font-medium text-brand-700 hover:underline">
                            {resourceById.get(booking.resource_id)?.title || 'Resource booking'}
                          </Link>
                          <p className="mt-1 text-xs text-neutral-500">Submitted {formatDate(booking.created_at)}</p>
                        </div>
                        <Badge variant="default">{booking.status.replaceAll('_', ' ')}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          </div>
          <Alert variant="info" title="Impact and recommendation data">
            Wait-list aggregates, resource utilisation baselines, cost estimates, and recommended
            opportunities are not shown because this backend has no organisation aggregation or
            recommendation contract. No metrics or opportunities are fabricated.
          </Alert>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Card>
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
      <Link to={href} className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
        View records
      </Link>
    </Card>
  )
}
