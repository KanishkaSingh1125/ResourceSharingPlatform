import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { BookingFollowup } from './BookingFollowup'
import {
  cancelBooking,
  claimWaitlistOffer,
  getMyBookings,
  getMyWaitingList,
  leaveWaitingList,
} from '@/features/bookings'
import type { Booking, BookingStatus, WaitingListEntry } from '@/types'

const statuses: { value: BookingStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduling_requested', label: 'Reschedule requested' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'no_show', label: 'No show' },
]

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([])
  const [status, setStatus] = useState<BookingStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [bookingResult, waitlistResult] = await Promise.all([
      getMyBookings({ status: status || undefined, page: 1, pageSize: 100 }),
      getMyWaitingList(),
    ])
    const failures = [bookingResult.error, waitlistResult.error].filter(Boolean)
    if (failures.length) {
      setError(failures.join(' '))
    }
    setBookings(bookingResult.data)
    setWaitingList(waitlistResult.data)
    setLoading(false)
  }, [status])

  useEffect(() => { void load() }, [load])

  async function handleCancel(booking: Booking) {
    setPendingId(booking.id)
    setError(null)
    setNotice(null)
    const result = await cancelBooking(booking.id, 'Cancelled by the booking owner.')
    setPendingId(null)
    if (!result.success) {
      setError(result.error ?? 'Could not cancel this booking.')
      return
    }
    setNotice('Booking cancelled.')
    await load()
  }

  async function handleWaitlist(entry: WaitingListEntry, action: 'claim' | 'leave') {
    setPendingId(entry.id)
    setError(null)
    setNotice(null)
    const result = action === 'claim'
      ? await claimWaitlistOffer(entry.id)
      : await leaveWaitingList(entry.id)
    setPendingId(null)
    if (!result.success) {
      setError(result.error ?? `Could not ${action} this waitlist entry.`)
      return
    }
    setNotice(action === 'claim' ? 'Waitlist offer claimed and booking created.' : 'Waitlist request withdrawn.')
    await load()
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Bookings</h1>
          <p className="mt-1 text-sm text-neutral-600">Booking and waitlist records returned for your account.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      <div className="mt-5 max-w-xs">
        <label className="block text-sm font-medium text-neutral-700">
          Filter bookings
          <select value={status} onChange={event => setStatus(event.target.value as BookingStatus | '')}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
            {statuses.map(option => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <section className="mt-6" aria-busy={loading}>
        <h2 className="text-lg font-semibold text-neutral-900">Bookings</h2>
        <div className="mt-3 space-y-3">
          {loading ? <Card className="text-sm text-neutral-600">Loading bookings…</Card>
            : error && bookings.length === 0 ? null
            : bookings.length === 0 ? <Card className="text-sm text-neutral-600">No bookings match this filter.</Card>
            : bookings.map(booking => {
              const canCancel = ['pending_approval', 'confirmed', 'rescheduling_requested'].includes(booking.status)
              return (
                <Card key={booking.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900">{booking.resources?.name ?? 'Resource'}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{formatDateRange(booking.starts_at, booking.ends_at)}</p>
                      {booking.resources?.location && <p className="mt-1 text-sm text-neutral-600">{booking.resources.location}</p>}
                      {booking.purpose && <p className="mt-2 text-sm text-neutral-600">Purpose: {booking.purpose}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusStyle(booking.status)}`}>
                      {booking.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {canCancel && (
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      <Button type="button" size="sm" variant="outline" disabled={pendingId === booking.id}
                        onClick={() => void handleCancel(booking)}>
                        {pendingId === booking.id ? 'Cancelling…' : 'Cancel booking'}
                      </Button>
                    </div>
                  )}
                  <BookingFollowup booking={booking} />
                </Card>
              )
            })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900">Waiting list</h2>
        <div className="mt-3 space-y-3" aria-busy={loading}>
          {loading ? <Card className="text-sm text-neutral-600">Loading waitlist…</Card>
            : error && waitingList.length === 0 ? null
            : waitingList.length === 0 ? <Card className="text-sm text-neutral-600">You have no waitlist requests.</Card>
            : waitingList.map(entry => (
              <Card key={entry.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900">{(entry.resources as { name?: string } | undefined)?.name ?? 'Resource'}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{formatDateRange(entry.starts_at, entry.ends_at)}</p>
                  <p className="mt-1 text-sm text-neutral-600">Status: {entry.status}</p>
                  {entry.offer_expires_at && entry.status === 'offered' && (
                    <p className="mt-1 text-xs text-amber-800">Offer expires {formatDate(entry.offer_expires_at)}.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.status === 'offered' && (
                    <Button type="button" size="sm" disabled={pendingId === entry.id}
                      onClick={() => void handleWaitlist(entry, 'claim')}>
                      {pendingId === entry.id ? 'Claiming…' : 'Claim offer'}
                    </Button>
                  )}
                  {['waiting', 'offered'].includes(entry.status) && (
                    <Button type="button" size="sm" variant="outline" disabled={pendingId === entry.id}
                      onClick={() => void handleWaitlist(entry, 'leave')}>Withdraw</Button>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </section>
      <p className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Status and waitlist actions are revalidated by server-side RPCs.
      </p>
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

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function bookingStatusStyle(status: BookingStatus) {
  if (status === 'confirmed' || status === 'completed') return 'bg-green-50 text-green-800'
  if (status === 'pending_approval' || status === 'rescheduling_requested') return 'bg-amber-50 text-amber-800'
  return 'bg-neutral-100 text-neutral-700'
}
