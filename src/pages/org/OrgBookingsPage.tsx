import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { confirmBooking, getOrgPendingBookings, rejectBooking } from '@/features/bookings'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { Booking } from '@/types'

export function OrgBookingsPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setBookings([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getOrgPendingBookings(activeOrganisation.id)
    setBookings(result.data)
    setError(result.error)
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  const canReview = ['owner', 'admin', 'manager'].includes(activeOrganisation?.my_role ?? '')

  async function decide(booking: Booking, decision: 'confirm' | 'reject') {
    const reason = reasons[booking.id]?.trim() ?? ''
    if (decision === 'reject' && reason.length < 5) {
      setError('Enter a rejection reason of at least five characters.')
      return
    }
    setPendingId(booking.id)
    setError(null)
    setNotice(null)
    const result = decision === 'confirm'
      ? await confirmBooking(booking.id)
      : await rejectBooking(booking.id, reason)
    setPendingId(null)
    if (!result.success) {
      setError(result.error ?? `Could not ${decision} this request.`)
      return
    }
    setNotice(`Booking ${decision === 'confirm' ? 'confirmed' : 'rejected'}.`)
    setBookings(current => current.filter(item => item.id !== booking.id))
  }

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to view booking requests.'}</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Booking Requests</h1>
          <p className="mt-1 text-sm text-neutral-600">Requests for {activeOrganisation.name}; decisions are authorised by the database.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <div className="mt-5 space-y-3" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading booking requests…</Card>
        ) : error && bookings.length === 0 ? null : bookings.length === 0 ? (
          <Card className="py-10 text-center text-sm text-neutral-600">No pending booking requests.</Card>
        ) : bookings.map(booking => (
          <Card key={booking.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-neutral-900">{booking.resources?.name ?? 'Resource'}</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Requested by {booking.profiles?.display_name || booking.profiles?.email || 'Member'}
                </p>
                <p className="mt-1 text-sm text-neutral-600">{formatDateRange(booking.starts_at, booking.ends_at)}</p>
                {booking.purpose && <p className="mt-2 text-sm text-neutral-700">Purpose: {booking.purpose}</p>}
                {booking.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{booking.notes}</p>}
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Pending approval</span>
            </div>
            {canReview ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
                <label className="sr-only" htmlFor={`reject-reason-${booking.id}`}>Rejection reason</label>
                <input id={`reject-reason-${booking.id}`} value={reasons[booking.id] ?? ''}
                  onChange={event => setReasons(current => ({ ...current, [booking.id]: event.target.value }))}
                  maxLength={300} placeholder="Reason required to reject"
                  className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                <Button type="button" variant="outline" disabled={pendingId === booking.id}
                  onClick={() => void decide(booking, 'reject')}>
                  {pendingId === booking.id ? 'Saving…' : 'Reject'}
                </Button>
                <Button type="button" disabled={pendingId === booking.id}
                  onClick={() => void decide(booking, 'confirm')}>
                  {pendingId === booking.id ? 'Saving…' : 'Confirm'}
                </Button>
              </div>
            ) : (
              <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                Your organisation role does not allow booking decisions.
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Time unavailable'
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
}
