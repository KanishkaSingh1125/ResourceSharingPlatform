import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, ShieldAlert } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { getMyBookings } from '@/features/bookings'
import { reportIncident } from '@/features/incidents'
import { searchResources } from '@/features/resources'
import type { Booking, IncidentSeverity, Resource } from '@/types'

export function SafetyPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [resourceId, setResourceId] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [resourceResult, bookingResult] = await Promise.all([
      searchResources({ page: 1, pageSize: 100 }),
      getMyBookings({ page: 1, pageSize: 100 }),
    ])
    if (resourceResult.error) setError(resourceResult.error)
    if (bookingResult.error) {
      setError(current => [current, bookingResult.error].filter(Boolean).join(' '))
    }
    setResources(resourceResult.data)
    setBookings(bookingResult.data)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const relatedBookings = bookings.filter(booking => booking.resource_id === resourceId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await reportIncident({
      resource_id: resourceId,
      booking_id: bookingId || undefined,
      severity,
      title: title.trim(),
      description: description.trim(),
    })
    setSaving(false)
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not submit the incident report.')
      return
    }
    setNotice('Incident report submitted. The resource organisation will review it through its authorised workflow.')
    setResourceId('')
    setBookingId('')
    setTitle('')
    setDescription('')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
        <ShieldAlert className="h-6 w-6 text-brand-600" aria-hidden="true" /> Safety report
      </h1>
      <p className="mt-1 text-sm text-neutral-600">Report an actual safety or resource issue. Reports are recorded by the backend and routed to resource managers.</p>
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <Card className="mt-5">
        {loading ? <p className="text-sm text-neutral-600">Loading available resources…</p> : resources.length === 0 ? (
          <p className="text-sm text-neutral-600">No published resources are currently available to report against.</p>
        ) : (
          <form onSubmit={event => void handleSubmit(event)} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Resource
              <select required value={resourceId} onChange={event => { setResourceId(event.target.value); setBookingId('') }}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="">Select a resource</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}{resource.organisations?.name ? ` — ${resource.organisations.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Related booking (optional)
              <select value={bookingId} onChange={event => setBookingId(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2" disabled={!resourceId}>
                <option value="">No related booking</option>
                {relatedBookings.map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {booking.id.slice(0, 8)} · {booking.status} · {new Date(booking.starts_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Severity
              <select value={severity} onChange={event => setSeverity(event.target.value as IncidentSeverity)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Summary
              <input required minLength={3} maxLength={160} value={title} onChange={event => setTitle(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              What happened?
              <textarea required minLength={5} maxLength={5000} rows={5} value={description}
                onChange={event => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <Button type="submit" disabled={saving || !resourceId}>{saving ? 'Submitting…' : 'Submit report'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
