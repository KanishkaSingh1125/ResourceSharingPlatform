import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, Textarea } from '@/components/ui'
import { decideBooking, getBookings, markBookingNoShow } from '@/services/bookingService'
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function OrgBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('reject')
  const [reason, setReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    try {
      const profile = await getCurrentProfile()
      const list = await getBookings({ ownerOrganisationId: profile.organisationId })
      setBookings(list)
      setErrorText(null)
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Booking requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, reload])

  const openDecision = (booking: Booking, next: 'approve' | 'reject') => {
    setSelected(booking)
    setDecision(next)
    setReason('')
  }

  const submitDecision = async () => {
    if (!selected) return
    if (decision === 'reject' && !reason.trim()) {
      setErrorText('Provide a reason before rejecting a booking.')
      return
    }
    setProcessingId(selected.id)
    setErrorText(null)
    try {
      const updated = await decideBooking({
        bookingId: selected.id,
        decision,
        reason: reason.trim() || undefined,
      })
      setBookings((items) => items.map((item) => item.id === updated.id ? updated : item))
      setSelected(null)
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'The backend did not confirm this decision.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleNoShow = async (booking: Booking) => {
    setProcessingId(booking.id)
    setErrorText(null)
    try {
      const updated = await markBookingNoShow(booking.id)
      setBookings((items) => items.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'The backend did not confirm the no-show update.')
    } finally {
      setProcessingId(null)
    }
  }

  const pending = bookings.filter((booking) => booking.status === 'pending')
  const history = bookings.filter((booking) => booking.status !== 'pending')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking requests"
        subtitle="Review backend-submitted requests for your organisation's resources."
        breadcrumbs={[
          { label: 'Organisation', to: '/org' },
          { label: 'Booking requests' },
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

      {errorText && <Alert variant="error" title="Booking action failed">{errorText}</Alert>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Needs review</h2>
          <Badge variant={pending.length ? 'warning' : 'default'}>{pending.length} pending</Badge>
        </div>
        {loading ? (
          <Card><p className="text-sm text-neutral-500">Loading requests from the backend...</p></Card>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            title="No pending booking requests"
            description="New requests for your organisation will appear here."
            compact
          />
        ) : pending.map((booking) => (
          <Card key={booking.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-neutral-900">{booking.resourceTitle}</h3>
                  <Badge variant="warning">{STATUS_LABELS[booking.status]}</Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  Requested by {booking.userName} ({booking.userEmail || booking.userOrganisationName})
                </p>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateTime(booking.startTime)} – {formatDateTime(booking.endTime)}
                </div>
                <p className="whitespace-pre-wrap text-sm text-neutral-700">{booking.purpose}</p>
                {booking.specialRequirements && (
                  <p className="text-xs text-neutral-500">Special requirements: {booking.specialRequirements}</p>
                )}
                <Link className="inline-block text-xs font-medium text-brand-700 hover:underline" to={`/dashboard/bookings/${booking.id}`}>
                  View request details
                </Link>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="primary" size="sm" disabled={processingId === booking.id} onClick={() => openDecision(booking, 'approve')}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button variant="danger" size="sm" disabled={processingId === booking.id} onClick={() => openDecision(booking, 'reject')}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-neutral-900">Booking history</h2>
        {history.length === 0 ? (
          <Card><p className="text-sm text-neutral-500">No reviewed or completed bookings.</p></Card>
        ) : (
          <div className="space-y-2">
            {history.map((booking) => (
              <Card key={booking.id} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">{booking.resourceTitle}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {booking.userName} · {formatDateTime(booking.startTime)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(booking.status)}>{STATUS_LABELS[booking.status]}</Badge>
                    <Link className="text-xs font-medium text-brand-700 hover:underline" to={`/dashboard/bookings/${booking.id}`}>
                      Details
                    </Link>
                    {['approved', 'confirmed'].includes(booking.status) && new Date(booking.endTime).getTime() < now && (
                      <Button variant="outline" size="xs" disabled={processingId === booking.id} onClick={() => void handleNoShow(booking)}>
                        Mark no-show
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={selected !== null}
        onClose={() => processingId === null && setSelected(null)}
        title={decision === 'approve' ? 'Approve booking request' : 'Reject booking request'}
        description={selected ? `${selected.resourceTitle} · ${selected.userName}` : undefined}
        footer={
          <>
            <Button variant="outline" disabled={processingId !== null} onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              variant={decision === 'approve' ? 'primary' : 'danger'}
              disabled={processingId !== null || (decision === 'reject' && !reason.trim())}
              isLoading={processingId !== null}
              onClick={() => void submitDecision()}
            >
              {decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
            </Button>
          </>
        }
      >
        {decision === 'approve' ? (
          <Alert variant="info" title="Approval">
            The backend will transition the request to confirmed only after the approval update succeeds.
          </Alert>
        ) : (
          <div className="space-y-2">
            <label htmlFor="booking-rejection-reason" className="text-sm font-medium text-neutral-700">
              Reason for rejection <span className="text-red-600">*</span>
            </label>
            <Textarea
              id="booking-rejection-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this request cannot be approved."
              required
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
