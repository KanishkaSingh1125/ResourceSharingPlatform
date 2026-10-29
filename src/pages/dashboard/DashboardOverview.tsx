import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CalendarDays, Clock3 } from 'lucide-react'
import { Card } from '@/components/ui'
import { getMyBookings } from '@/features/bookings'
import { getMyUnreadNotificationCount } from '@/lib/notificationService'
import type { Booking } from '@/types'

interface OverviewData {
  pending: number
  confirmed: number
  unread: number
  recentBookings: Booking[]
}

export function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [pending, confirmed, unread, recent] = await Promise.all([
      getMyBookings({ status: 'pending_approval', pageSize: 1 }),
      getMyBookings({ status: 'confirmed', pageSize: 1 }),
      getMyUnreadNotificationCount(),
      getMyBookings({ pageSize: 5 }),
    ])
    const failures = [pending.error, confirmed.error, unread.error, recent.error].filter(Boolean)
    if (failures.length || unread.count === null) {
      setError(failures.join(' ') || 'Could not load your account summary.')
      setData(null)
    } else {
      setData({
        pending: pending.count,
        confirmed: confirmed.count,
        unread: unread.count,
        recentBookings: recent.data,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-600">Your account summary from current booking and notification records.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
        {loading ? <Card className="text-sm text-neutral-600">Loading your overview…</Card>
          : error ? <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-800">{error}</Card>
          : data && (
            <>
              <SummaryCard label="Confirmed bookings" value={data.confirmed} icon={CalendarDays} to="/dashboard/bookings" />
              <SummaryCard label="Pending approval" value={data.pending} icon={Clock3} to="/dashboard/bookings" />
              <SummaryCard label="Unread notifications" value={data.unread} icon={Bell} to="/dashboard/notifications" />
            </>
          )}
      </div>
      {data && (
        <Card className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">Recent bookings</h2>
            <Link to="/dashboard/bookings" className="text-sm font-medium text-brand-700 underline">View all</Link>
          </div>
          {data.recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">No bookings yet. Browse resources to make a request.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {data.recentBookings.map(booking => (
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-neutral-800">{booking.resources?.name ?? 'Resource'}</p>
                    <p className="text-xs text-neutral-500">{formatDate(booking.starts_at)}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">{booking.status.replaceAll('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <Card className="mt-5">
        <h2 className="font-semibold text-neutral-900">Explore</h2>
        <p className="mt-1 text-sm text-neutral-600">Search current listings and send booking requests that are validated by the backend.</p>
        <Link className="mt-3 inline-block text-sm font-medium text-brand-700 underline" to="/dashboard/discover">Discover resources</Link>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, to }: {
  label: string
  value: number
  icon: typeof CalendarDays
  to: string
}) {
  return (
    <Link to={to} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <Card className="transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
