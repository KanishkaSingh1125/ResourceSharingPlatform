import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, RefreshCw } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui'
import { getBookings } from '@/services/bookingService'
import { getCurrentProfile } from '@/services/authService'
import { type Booking, type BookingStatus } from '@/types/booking'

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending approval',
  approved: 'Confirmed',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  rescheduling_requested: 'Rescheduling requested',
  in_progress: 'In progress',
  completed: 'Completed',
  no_show: 'No-show',
}

function statusVariant(status: BookingStatus) {
  if (status === 'approved' || status === 'confirmed' || status === 'completed') return 'success'
  if (status === 'pending' || status === 'rescheduling_requested') return 'warning'
  if (status === 'rejected' || status === 'cancelled' || status === 'no_show') return 'error'
  return 'primary'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    getCurrentProfile()
      .then((profile) => getBookings({ userId: profile.id }))
      .then((items) => {
        if (active) {
          setBookings(items)
          setErrorText(null)
        }
      })
      .catch((err) => {
        if (active) {
          setErrorText(err instanceof Error ? err.message : 'Bookings could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reload])

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Bookings"
        subtitle="Review booking requests, confirmed reservations, and past activity."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Bookings' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              setReload((count) => count + 1)
            }}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {errorText && (
        <Alert variant="error" title="Bookings unavailable">
          {errorText}
        </Alert>
      )}

      {loading ? (
        <Card><p className="text-sm text-neutral-500">Loading bookings from the backend...</p></Card>
      ) : bookings.length === 0 && !errorText ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6 text-brand-600" />}
          title="No bookings yet"
          description="Bookings you submit will appear here after the backend confirms the request."
          actionLabel="Discover resources"
          onAction={() => { window.location.href = '/dashboard/discover' }}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-neutral-900">{booking.resourceTitle}</h2>
                    <Badge variant={statusVariant(booking.status)}>{STATUS_LABELS[booking.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateTime(booking.startTime)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Until {formatDateTime(booking.endTime)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {booking.ownerOrganisationName}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-neutral-600">{booking.purpose}</p>
                </div>
                <Link
                  to={`/dashboard/bookings/${booking.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Booking details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
