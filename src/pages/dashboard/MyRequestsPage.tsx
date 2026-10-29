import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import { Alert, Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { getBookings } from '@/services/bookingService'
import { getCurrentProfile } from '@/services/authService'
import { type Booking } from '@/types/booking'

export function MyRequestsPage() {
  const [requests, setRequests] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCurrentProfile()
      .then((profile) => getBookings({ userId: profile.id }))
      .then((bookings) => {
        if (active) setRequests(bookings.filter((booking) => ['pending', 'rescheduling_requested'].includes(booking.status)))
      })
      .catch((err) => {
        if (active) setErrorText(err instanceof Error ? err.message : 'Requests could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Access Requests"
        subtitle="Track pending booking and rescheduling decisions from host organisations."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Requests' },
        ]}
      />
      {errorText && <Alert variant="error" title="Requests unavailable">{errorText}</Alert>}
      {loading ? (
        <Card><p className="text-sm text-neutral-500">Loading requests from the backend...</p></Card>
      ) : requests.length === 0 && !errorText ? (
        <EmptyState
          icon={<Send className="h-6 w-6 text-brand-600" />}
          title="No requests awaiting a decision"
          description="Requests you submit will appear here after the backend records them."
          actionLabel="Explore resources"
          onAction={() => { window.location.href = '/dashboard/discover' }}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((booking) => (
            <Card key={booking.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-neutral-900">{booking.resourceTitle}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{booking.ownerOrganisationName}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.startTime))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="warning">{booking.status === 'pending' ? 'Pending approval' : 'Rescheduling requested'}</Badge>
                  <Link className="text-sm font-medium text-brand-700 hover:underline" to={`/dashboard/bookings/${booking.id}`}>
                    Details
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
