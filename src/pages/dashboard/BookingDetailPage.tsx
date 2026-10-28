import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, MapPin, XCircle } from 'lucide-react'
import { type ReactNode } from 'react'
import { Alert, Badge, Button, Card, Modal, PageHeader } from '@/components/ui'
import { cancelBooking, getBookingById } from '@/services/bookingService'
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

function formatDateTime(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return

    getBookingById(id)
      .then((result) => {
        if (!active) return
        setBooking(result)
        setErrorText(result ? null : 'This booking was not found or you do not have permission to view it.')
      })
      .catch((err) => {
        if (active) setErrorText(err instanceof Error ? err.message : 'Booking details could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const handleCancel = async () => {
    if (!booking) return
    setSaving(true)
    setErrorText(null)
    try {
      const updated = await cancelBooking(booking.id)
      setBooking(updated)
      setCancelOpen(false)
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Cancellation was not confirmed by the backend.')
    } finally {
      setSaving(false)
    }
  }

  const canCancel = booking && ['pending', 'approved', 'confirmed'].includes(booking.status)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking details"
        subtitle="Status and actions are shown from the booking record returned by the backend."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Bookings', to: '/dashboard/bookings' },
          { label: 'Details' },
        ]}
        actions={
          <Link to="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" />
            All bookings
          </Link>
        }
      />

      {errorText && <Alert variant="error" title="Booking update">
        {errorText}
      </Alert>}

      {loading ? (
        <Card><p className="text-sm text-neutral-500">Loading booking from the backend...</p></Card>
      ) : booking ? (
        <>
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-neutral-900">{booking.resourceTitle}</h2>
                  <Badge variant={statusVariant(booking.status)}>{STATUS_LABELS[booking.status] || booking.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">{booking.resourceCategory}</p>
              </div>
              {canCancel && (
                <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Cancel booking
                </Button>
              )}
            </div>

            <div className="mt-6 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
              <Detail label="Requester" value={`${booking.userName}${booking.userEmail ? ` · ${booking.userEmail}` : ''}`} />
              <Detail label="Requester organisation" value={booking.userOrganisationName} />
              <Detail label="Host organisation" value={booking.ownerOrganisationName} />
              <Detail label="Attendees" value={booking.attendeesCount ? String(booking.attendeesCount) : 'Not specified'} />
              <Detail label="Start" value={formatDateTime(booking.startTime)} icon={<CalendarDays className="h-4 w-4" />} />
              <Detail label="End" value={formatDateTime(booking.endTime)} icon={<Clock3 className="h-4 w-4" />} />
              <Detail label="Submitted" value={formatDateTime(booking.createdAt)} />
              <Detail label="Last updated" value={formatDateTime(booking.updatedAt)} />
              <Detail label="Approved at" value={formatDateTime(booking.approvedAt)} />
              <Detail label="Checked in" value={formatDateTime(booking.checkInTime)} />
              <Detail label="Checked out" value={formatDateTime(booking.checkOutTime)} />
              {booking.approvedBy && <Detail label="Approved by" value={booking.approvedBy} />}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="font-semibold text-neutral-900">Intended use</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{booking.purpose}</p>
              {booking.specialRequirements && (
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <h4 className="text-xs font-semibold uppercase text-neutral-500">Special requirements</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{booking.specialRequirements}</p>
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-neutral-900">Decision and policy</h3>
              {booking.status === 'rejected' ? (
                <p className="mt-2 text-sm text-red-700">
                  Rejection reason: {booking.rejectionReason || 'No reason was supplied.'}
                </p>
              ) : (
                <p className="mt-2 text-sm text-neutral-600">
                  Cancellation and rescheduling decisions are subject to the host organisation&apos;s booking policy.
                  The booking status changes only after the backend confirms the action.
                </p>
              )}
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Rescheduling is not enabled until its backend contract is available."
                >
                  Request reschedule
                </Button>
                <p className="mt-2 text-xs text-neutral-500">
                  Rescheduling is temporarily unavailable because the backend does not yet support storing or reviewing proposed replacement times.
                </p>
              </div>
              {booking.qrPassCode && ['approved', 'confirmed'].includes(booking.status) && (
                <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                  Confirmed check-in pass: <span className="font-mono font-semibold">{booking.qrPassCode}</span>
                </div>
              )}
            </Card>
          </div>
        </>
      ) : !errorText ? (
        <Alert variant="warning" title="Booking not found">No booking record was returned.</Alert>
      ) : null}

      <Modal
        isOpen={cancelOpen}
        onClose={() => !saving && setCancelOpen(false)}
        title="Cancel this booking?"
        description="The cancellation is sent to the backend; the displayed status will update only after it succeeds."
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={saving}>Keep booking</Button>
            <Button variant="danger" onClick={handleCancel} disabled={saving} isLoading={saving}>Confirm cancellation</Button>
          </>
        }
      >
        <Alert variant="warning" title="Check the host policy">
          Cancellation terms are set by the host organisation. If the reservation is imminent or already underway, contact the host manager; the backend may reject a cancellation that is no longer permitted.
        </Alert>
      </Modal>
    </div>
  )
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 break-words text-sm text-neutral-900">
        {icon || (label === 'Host organisation' ? <MapPin className="h-4 w-4 text-neutral-400" /> : null)}
        {value}
      </dd>
    </div>
  )
}
