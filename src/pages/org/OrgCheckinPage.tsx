import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { QrCode } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { consumeBookingQrToken } from '@/features/bookings'
import { getOrgResources } from '@/features/resources'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { Resource } from '@/types'

export function OrgCheckinPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceId, setResourceId] = useState('')
  const [eventType, setEventType] = useState<'check_in' | 'check_out'>('check_in')
  const [token, setToken] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setResources([])
      setLoading(false)
      return
    }
    if (!['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)) {
      setResources([])
      setError('Only resource managers can record check-in or check-out events.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getOrgResources(activeOrganisation.id)
    if (result.error) {
      setResources([])
      setError(result.error)
    } else {
      setResources(result.data)
      setResourceId(current => result.data.some(resource => resource.id === current) ? current : result.data[0]?.id ?? '')
    }
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation.'}</p>
  }
  if (!['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)) {
    return <Card role="alert" className="border-amber-200 bg-amber-50 text-sm text-amber-900">Only resource managers can record check-in or check-out events.</Card>
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await consumeBookingQrToken(token.trim(), resourceId, eventType, notes.trim())
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'The QR token could not be accepted.')
      return
    }
    setToken('')
    setNotes('')
    setNotice(`${eventType === 'check_in' ? 'Check-in' : 'Check-out'} recorded. The one-time token can no longer be replayed.`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900"><QrCode className="h-6 w-6 text-brand-600" aria-hidden="true" />Booking check-in/out</h1>
      <p className="mt-1 text-sm text-neutral-600">Scan the booker’s QR with an approved scanner and paste its token here. The backend validates the booking, time window, resource, safety hold, actor, and single-use state.</p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <Card className="mt-5">
        {loading ? <p className="text-sm text-neutral-600">Loading organisation resources…</p> : resources.length === 0 ? (
          <p className="text-sm text-neutral-600">No resources are available for this organisation.</p>
        ) : (
          <form onSubmit={event => void handleSubmit(event)} className="space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Resource
              <select required value={resourceId} onChange={event => setResourceId(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                {resources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Event
              <select value={eventType} onChange={event => setEventType(event.target.value as 'check_in' | 'check_out')}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="check_in">Check-in</option>
                <option value="check_out">Check-out</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              QR token
              <input required type="password" autoComplete="off" spellCheck={false} value={token}
                onChange={event => setToken(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Notes (optional)
              <input maxLength={500} value={notes} onChange={event => setNotes(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <Button type="submit" disabled={saving || !resourceId || !token.trim()}>{saving ? 'Verifying…' : 'Verify and record'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
