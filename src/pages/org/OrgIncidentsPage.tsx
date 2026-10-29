import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  getIncidentHistory,
  getResourceIncidents,
  getSafetyHolds,
  placeSafetyHold,
  releaseSafetyHold,
  updateIncidentStatus,
} from '@/features/incidents'
import { getOrgResources } from '@/features/resources'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { Incident, IncidentHistoryEntry, SafetyHold } from '@/types'

interface IncidentRecord extends Incident {
  resourceName: string
  history: IncidentHistoryEntry[]
  historyError: string | null
}

interface HoldRecord extends SafetyHold {
  resourceName: string
}

export function OrgIncidentsPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [resources, setResources] = useState<{ id: string; name: string }[]>([])
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [holds, setHolds] = useState<HoldRecord[]>([])
  const [holdResourceId, setHoldResourceId] = useState('')
  const [holdReason, setHoldReason] = useState('')
  const [holdExpiry, setHoldExpiry] = useState('')
  const [releaseReason, setReleaseReason] = useState('')
  const [transitionReasons, setTransitionReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setLoading(false)
      setIncidents([])
      setHolds([])
      return
    }
    if (!['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)) {
      setLoading(false)
      setError('Only resource managers can review incidents and safety holds.')
      return
    }
    setLoading(true)
    setError(null)
    const resourceResult = await getOrgResources(activeOrganisation.id)
    if (resourceResult.error) {
      setError(resourceResult.error)
      setResources([])
      setLoading(false)
      return
    }
    setResources(resourceResult.data.map(resource => ({ id: resource.id, name: resource.name })))
    const [incidentGroups, holdGroups] = await Promise.all([
      Promise.all(resourceResult.data.map(async resource => ({
        resourceName: resource.name,
        result: await getResourceIncidents(resource.id),
      }))),
      Promise.all(resourceResult.data.map(async resource => ({
        resourceName: resource.name,
        result: await getSafetyHolds(resource.id),
      }))),
    ])
    const queryErrors = [
      ...incidentGroups.map(group => group.result.error),
      ...holdGroups.map(group => group.result.error),
    ].filter(Boolean)
    if (queryErrors.length) {
      setError(queryErrors.join(' '))
      setIncidents([])
      setHolds([])
      setLoading(false)
      return
    }
    const incidentItems = incidentGroups.flatMap(group => group.result.data.map(incident => ({
      ...incident,
      resourceName: group.resourceName,
    })))
    const historyGroups = await Promise.all(incidentItems.map(async incident => ({
      incidentId: incident.id,
      result: await getIncidentHistory(incident.id),
    })))
    const historyByIncident = new Map(historyGroups.map(group => [group.incidentId, group.result]))
    setIncidents(incidentItems.map(incident => {
      const history = historyByIncident.get(incident.id)
      return {
        ...incident,
        history: history?.data ?? [],
        historyError: history?.error ?? null,
      }
    }).sort((a, b) => b.created_at.localeCompare(a.created_at)))
    setHolds(holdGroups.flatMap(group => group.result.data.map(hold => ({
      ...hold,
      resourceName: group.resourceName,
    }))).sort((a, b) => b.placed_at.localeCompare(a.placed_at)))
    setHoldResourceId(current =>
      resourceResult.data.some(resource => resource.id === current)
        ? current
        : resourceResult.data[0]?.id ?? '',
    )
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation.'}</p>
  }
  const canManage = ['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)
  if (!canManage) {
    return <Card role="alert" className="border-amber-200 bg-amber-50 text-sm text-amber-900">Only resource managers can review incidents and safety holds.</Card>
  }

  async function transition(incident: IncidentRecord, status: 'investigating' | 'resolved' | 'closed') {
    const reason = transitionReasons[incident.id]?.trim() ?? ''
    if (['resolved', 'closed'].includes(status) && reason.length < 5) {
      setError('Enter a resolution reason of at least five characters.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await updateIncidentStatus(incident.id, status, reason)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice(`Incident marked ${status}.`)
    await load()
  }

  async function createHold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (holdReason.trim().length < 5) {
      setError('Safety-hold reason must be at least five characters.')
      return
    }
    const expiry = holdExpiry ? new Date(holdExpiry) : null
    if (expiry && (Number.isNaN(expiry.getTime()) || expiry <= new Date())) {
      setError('Safety-hold expiry must be in the future.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await placeSafetyHold({
      resource_id: holdResourceId,
      reason: holdReason.trim(),
      expires_at: expiry?.toISOString(),
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Could not place the safety hold.')
      return
    }
    setHoldReason('')
    setHoldExpiry('')
    setNotice('Safety hold placed. The database enforces its effect on future bookings and check-in.')
    await load()
  }

  async function releaseHold(hold: HoldRecord) {
    if (releaseReason.trim().length < 5) {
      setError('Enter a release reason of at least five characters.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await releaseSafetyHold(hold.id, releaseReason.trim())
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Could not release the safety hold.')
      return
    }
    setReleaseReason('')
    setNotice('Safety hold released.')
    await load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Incidents and safety holds</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Review actual reports for {activeOrganisation.name}. Status transitions and hold effects are enforced by database RPCs.
      </p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <Card className="mt-5">
        <h2 className="flex items-center gap-2 font-semibold text-neutral-900"><ShieldCheck className="h-5 w-5" aria-hidden="true" />Place a safety hold</h2>
        <p className="mt-1 text-sm text-neutral-600">Future overlapping bookings may be cancelled by the protected backend workflow; already-started bookings are preserved.</p>
        <form onSubmit={event => void createHold(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-neutral-700">
            Resource
            <select required value={holdResourceId} onChange={event => setHoldResourceId(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
              {resources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Optional expiry
            <input type="datetime-local" value={holdExpiry} onChange={event => setHoldExpiry(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-neutral-700 sm:col-span-2">
            Reason
            <textarea required minLength={5} maxLength={1000} rows={2} value={holdReason}
              onChange={event => setHoldReason(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
          <div className="sm:col-span-2"><Button type="submit" disabled={saving || !holdResourceId || resources.length === 0}>{saving ? 'Saving…' : 'Place hold'}</Button></div>
        </form>
      </Card>

      <section className="mt-7" aria-busy={loading}>
        <h2 className="text-lg font-semibold text-neutral-900">Incident reports</h2>
        <div className="mt-3 space-y-3">
          {loading ? <Card className="text-sm text-neutral-600">Loading incident records…</Card>
            : error && incidents.length === 0 ? null
            : incidents.length === 0 ? <Card className="text-sm text-neutral-600">No incident reports for this organisation's resources.</Card>
            : incidents.map(incident => (
              <Card key={incident.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{incident.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{incident.resourceName} · {incident.severity} · {incident.status}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{incident.description}</p>
                    <p className="mt-2 text-xs text-neutral-500">Reported {formatDate(incident.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{incident.status}</span>
                </div>
                {incident.historyError ? (
                  <p role="alert" className="mt-3 text-xs text-red-700">Could not load incident history: {incident.historyError}</p>
                ) : incident.history.length > 0 && (
                  <details className="mt-3 border-t border-neutral-100 pt-3">
                    <summary className="cursor-pointer text-sm font-medium text-brand-700">Incident history ({incident.history.length})</summary>
                    <ol className="mt-2 space-y-2 text-xs text-neutral-600">
                      {incident.history.map(entry => (
                        <li key={entry.id}>{entry.action.replaceAll('_', ' ')} · {entry.new_status ?? 'reported'} · {formatDate(entry.created_at)}{entry.reason && ` · ${entry.reason}`}</li>
                      ))}
                    </ol>
                  </details>
                )}
                {incident.status !== 'closed' && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row">
                    <label className="sr-only" htmlFor={`incident-reason-${incident.id}`}>Resolution reason</label>
                    <input id={`incident-reason-${incident.id}`} value={transitionReasons[incident.id] ?? ''}
                      maxLength={300} onChange={event => setTransitionReasons(current => ({ ...current, [incident.id]: event.target.value }))}
                      placeholder="Required to resolve or close"
                      className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                    {incident.status === 'open' && (
                      <Button type="button" variant="outline" disabled={saving} onClick={() => void transition(incident, 'investigating')}>Investigate</Button>
                    )}
                    {incident.status !== 'resolved' && (
                      <Button type="button" disabled={saving} onClick={() => void transition(incident, 'resolved')}>Resolve</Button>
                    )}
                    <Button type="button" variant="outline" disabled={saving} onClick={() => void transition(incident, 'closed')}>Close</Button>
                  </div>
                )}
              </Card>
            ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-semibold text-neutral-900">Safety-hold history</h2>
        <div className="mt-3 space-y-3">
          {loading ? <Card className="text-sm text-neutral-600">Loading safety holds…</Card>
            : holds.length === 0 ? <Card className="text-sm text-neutral-600">No safety holds are recorded.</Card>
            : holds.map(hold => (
              <Card key={hold.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-medium text-neutral-900"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{hold.resourceName}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{hold.reason}</p>
                    <p className="mt-1 text-xs text-neutral-500">Placed {formatDate(hold.placed_at)}{hold.expires_at ? ` · Expires ${formatDate(hold.expires_at)}` : ' · No expiry recorded'}</p>
                    {hold.released_at && <p className="mt-1 text-xs text-neutral-500">Released {formatDate(hold.released_at)} · {hold.release_reason}</p>}
                  </div>
                  {!hold.released_at && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor={`release-reason-${hold.id}`}>Reason for releasing safety hold</label>
                      <input id={`release-reason-${hold.id}`} value={releaseReason} maxLength={300}
                        onChange={event => setReleaseReason(event.target.value)}
                        placeholder="Release reason"
                        className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                      <Button type="button" size="sm" variant="outline" disabled={saving || releaseReason.trim().length < 5}
                        onClick={() => void releaseHold(hold)}>Release hold</Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </section>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
