import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  TicketCheck,
  XCircle,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { checkUserResourceEligibility } from '@/services/eligibilityService'
import { getCurrentProfile } from '@/services/authService'
import {
  getMyWaitingList,
  getWaitingListAlternatives,
  joinWaitingList,
  leaveWaitingList,
  respondToWaitingListOffer,
} from '@/services/waitingListService'
import { getResources } from '@/services/resourceService'
import { type Resource } from '@/types/resource'
import {
  type WaitingListAlternative,
  type WaitingListEntry,
} from '@/types/waitingList'

const STATUS_DETAILS: Record<
  WaitingListEntry['status'],
  { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  waiting: { label: 'Waiting for a slot', variant: 'warning' },
  awaiting_decision: { label: 'Awaiting allocation decision', variant: 'info' },
  offered: { label: 'Slot offered', variant: 'success' },
  accepted: { label: 'Offer accepted', variant: 'success' },
  declined: { label: 'Offer declined', variant: 'default' },
  expired: { label: 'Offer expired', variant: 'error' },
  withdrawn: { label: 'Left waiting list', variant: 'default' },
  allocated: { label: 'Allocated', variant: 'success' },
  not_allocated: { label: 'Not allocated', variant: 'default' },
}

const ACTIONABLE_STATUSES: WaitingListEntry['status'][] = [
  'waiting',
  'awaiting_decision',
  'offered',
]

function localDate(daysFromNow = 1): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function WaitingListPage() {
  const { success, error, info } = useToast()
  const [searchParams] = useSearchParams()
  const [resources, setResources] = useState<Resource[]>([])
  const [entries, setEntries] = useState<WaitingListEntry[]>([])
  const [alternatives, setAlternatives] = useState<
    Record<string, { items?: WaitingListAlternative[]; error?: string }>
  >({})
  const [resourceId, setResourceId] = useState(searchParams.get('resource') || '')
  const [date, setDate] = useState(localDate())
  const [startTime, setStartTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const previousStatuses = useRef(new Map<string, WaitingListEntry['status']>())
  const loadRevision = useRef(0)
  const requestKey = useRef<{ signature: string; id: string } | null>(null)
  const initialLoad = useRef(true)

  const requestedResourceId = searchParams.get('resource')
  useEffect(() => {
    let active = true
    getResources({ limit: 100 })
      .then((result) => {
        if (!active) return
        setResources(result.items)
        setResourceError(null)
        if (requestedResourceId && result.items.some((resource) => resource.id === requestedResourceId)) {
          setResourceId(requestedResourceId)
        } else if (result.items[0]) {
          setResourceId(result.items[0].id)
        }
      })
      .catch((err) => {
        if (active) setResourceError(getErrorMessage(err, 'Resources could not be loaded.'))
      })
    return () => {
      active = false
    }
  }, [requestedResourceId])

  useEffect(() => {
    let active = true
    const revision = ++loadRevision.current
    const load = async () => {
      try {
        const loaded = await getMyWaitingList()
        if (!active || revision !== loadRevision.current) return
        if (!initialLoad.current) {
          for (const entry of loaded) {
            const previous = previousStatuses.current.get(entry.id)
            if (previous && previous !== entry.status) {
              info('Waiting-list status changed', `${entry.resourceTitle}: ${STATUS_DETAILS[entry.status].label}.`)
            }
          }
        }
        previousStatuses.current = new Map(loaded.map((entry) => [entry.id, entry.status]))
        setEntries(loaded)
        const results = await Promise.all(
          loaded
            .filter((entry) => ['declined', 'expired', 'not_allocated'].includes(entry.status))
            .map(async (entry) => {
              try {
                return [entry.id, { items: await getWaitingListAlternatives(entry.id) }] as const
              } catch (err) {
                return [entry.id, { error: getErrorMessage(err, 'Alternatives could not be loaded.') }] as const
              }
            })
        )
        if (!active || revision !== loadRevision.current) return
        setAlternatives(Object.fromEntries(results))
        setErrorText(null)
      } catch (err) {
        if (active && revision === loadRevision.current) {
          setErrorText(getErrorMessage(err, 'Waiting-list entries could not be loaded.'))
        }
      } finally {
        if (active && revision === loadRevision.current) {
          setLoading(false)
          initialLoad.current = false
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [reload, info])

  useEffect(() => {
    const interval = window.setInterval(() => setReload((count) => count + 1), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const selectedResource = resources.find((resource) => resource.id === resourceId)

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedResource) {
      error('Choose a resource', 'Select a resource before joining its waiting list.')
      return
    }
    if (!purpose.trim()) {
      error('Purpose required', 'Describe why you need this resource.')
      return
    }

    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      error('Choose a future time', 'Waiting-list requests must be for a future time window.')
      return
    }
    const startISO = start.toISOString()
    const endISO = end.toISOString()
    const signature = JSON.stringify([resourceId, startISO, endISO, purpose.trim()])
    if (requestKey.current?.signature !== signature) {
      requestKey.current = { signature, id: crypto.randomUUID() }
    }

    setSubmitting(true)
    try {
      const profile = await getCurrentProfile()
      const eligibility = await checkUserResourceEligibility(profile.id, selectedResource.id)
      if (!eligibility.isEligible) {
        throw new Error(eligibility.blockingReasons.join(' ') || 'You are not eligible for this resource.')
      }
      const entry = await joinWaitingList({
        resourceId: selectedResource.id,
        startTime: startISO,
        endTime: endISO,
        purpose: purpose.trim(),
        idempotencyKey: requestKey.current.id,
      })
      loadRevision.current += 1
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)])
      previousStatuses.current.set(entry.id, entry.status)
      requestKey.current = null
      setPurpose('')
      success('Waiting-list request saved', 'The status shown is the persisted status returned by the allocation service.')
      setReload((count) => count + 1)
    } catch (err) {
      loadRevision.current += 1
      error('Could not join waiting list', getErrorMessage(err, 'Please try again.'))
      setReload((count) => count + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeave = async (entry: WaitingListEntry) => {
    setActionId(entry.id)
    try {
      const updated = await leaveWaitingList(entry.id)
      loadRevision.current += 1
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item))
      previousStatuses.current.set(updated.id, updated.status)
      success('Waiting-list request updated', 'The backend confirmed that you left the list.')
      setReload((count) => count + 1)
    } catch (err) {
      loadRevision.current += 1
      error('Could not leave waiting list', getErrorMessage(err, 'Refresh the list and try again.'))
      setReload((count) => count + 1)
    } finally {
      setActionId(null)
    }
  }

  const handleOfferResponse = async (
    entry: WaitingListEntry,
    decision: 'accept' | 'decline'
  ) => {
    setActionId(entry.id)
    try {
      const updated = await respondToWaitingListOffer(entry.id, decision)
      loadRevision.current += 1
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item))
      previousStatuses.current.set(updated.id, updated.status)
      success(
        decision === 'accept' ? 'Offer accepted' : 'Offer declined',
        updated.outcomeReason || 'Your response was saved by the allocation service.'
      )
      setReload((count) => count + 1)
    } catch (err) {
      loadRevision.current += 1
      error('Offer response was not saved', getErrorMessage(err, 'Refresh your status and try again.'))
      setReload((count) => count + 1)
    } finally {
      setActionId(null)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    setReload((count) => count + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waiting List"
        subtitle="Join a queue for an unavailable resource or time slot, track allocation decisions, and respond to offers."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Waiting List' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh status
          </Button>
        }
      />

      {errorText && (
        <Alert variant="error" title="Waiting-list status unavailable">
          {errorText}
        </Alert>
      )}

      <Card>
        <h2 className="text-base font-semibold text-neutral-900">Request a place</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Eligibility and allocation are verified by the backend. Any queue position shown below comes directly from the service.
        </p>
        {resourceError && <Alert variant="error" title="Resources unavailable">{resourceError}</Alert>}
        <form className="mt-4 space-y-4" onSubmit={handleJoin}>
          <Select
            label="Resource"
            isRequired
            value={resourceId}
            onChange={(event) => {
              setResourceId(event.target.value)
              requestKey.current = null
            }}
            options={resources.map((resource) => ({
              value: resource.id,
              label: `${resource.title} — ${resource.organisationName}`,
            }))}
            placeholder="Select a resource"
            disabled={resources.length === 0 || submitting}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Requested date"
              type="date"
              isRequired
              min={localDate(0)}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                requestKey.current = null
              }}
              disabled={submitting}
            />
            <Input
              label="Start time"
              type="time"
              isRequired
              value={startTime}
              onChange={(event) => {
                setStartTime(event.target.value)
                requestKey.current = null
              }}
              disabled={submitting}
            />
            <Select
              label="Duration"
              value={String(durationMinutes)}
              onChange={(event) => {
                setDurationMinutes(Number(event.target.value))
                requestKey.current = null
              }}
              options={[
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 hour' },
                { value: '120', label: '2 hours' },
                { value: '240', label: '4 hours' },
                { value: '480', label: '8 hours' },
              ]}
              disabled={submitting}
            />
          </div>
          <Textarea
            label="Purpose"
            isRequired
            rows={3}
            value={purpose}
            onChange={(event) => {
              setPurpose(event.target.value)
              requestKey.current = null
            }}
            placeholder="Describe the intended use of this resource."
            disabled={submitting}
          />
          <Button type="submit" isLoading={submitting} disabled={!selectedResource}>
            Join waiting list
          </Button>
        </form>
      </Card>

      <section className="space-y-3" aria-labelledby="current-waitlist-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="current-waitlist-heading" className="text-lg font-semibold text-neutral-900">
            Your requests
          </h2>
          <p className="text-xs text-neutral-500">Statuses refresh automatically every 30 seconds.</p>
        </div>

        {loading ? (
          <Card><p className="text-sm text-neutral-500">Loading persisted waiting-list records...</p></Card>
        ) : entries.length === 0 && !errorText ? (
          <EmptyState
            icon={<TicketCheck className="h-6 w-6 text-brand-600" />}
            title="No waiting-list requests"
            description="When you join a list, its backend-confirmed status and any allocation offer will appear here."
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const status = STATUS_DETAILS[entry.status]
              const busy = actionId === entry.id
              const alternativesForEntry = alternatives[entry.id]
              return (
                <Card key={entry.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">{entry.resourceTitle}</h3>
                        <Badge variant={status.variant} showDot>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {formatDateTime(entry.startTime)} – {formatDateTime(entry.endTime)}
                      </p>
                      <p className="text-sm text-neutral-600">{entry.purpose}</p>
                      {entry.queuePositionVisible && entry.queuePosition !== null ? (
                        <p className="text-sm font-medium text-neutral-700">
                          Queue position: {entry.queuePosition}
                        </p>
                      ) : entry.status === 'waiting' ? (
                        <p className="text-sm text-neutral-500">Queue position is not disclosed for this list.</p>
                      ) : null}
                      {entry.status === 'offered' && entry.offerExpiresAt && (
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800">
                          <Clock3 className="h-4 w-4" />
                          Respond by {formatDateTime(entry.offerExpiresAt)}
                        </p>
                      )}
                      {entry.outcomeReason && (
                        <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
                          {entry.outcomeReason}
                        </p>
                      )}
                      {entry.allocationExplanation && (
                        <p className="text-sm text-neutral-600">{entry.allocationExplanation}</p>
                      )}
                      {alternativesForEntry?.error && (
                        <Alert variant="error" title="Alternatives unavailable">
                          {alternativesForEntry.error}
                        </Alert>
                      )}
                      {alternativesForEntry?.items && alternativesForEntry.items.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h4 className="text-sm font-semibold text-neutral-800">Suggested alternatives</h4>
                          {alternativesForEntry.items.map((alternative) => (
                            <Link
                              key={`${alternative.resourceId}:${alternative.startTime}`}
                              to={`/dashboard/resources/${alternative.resourceId}`}
                              className="block rounded-md border border-neutral-200 p-3 text-sm hover:border-brand-300 hover:bg-brand-50/40"
                            >
                              <span className="font-medium text-neutral-900">{alternative.resourceTitle}</span>
                              <span className="mt-1 block text-neutral-600">
                                {formatDateTime(alternative.startTime)} – {formatDateTime(alternative.endTime)}
                              </span>
                              {alternative.explanation && (
                                <span className="mt-1 block text-neutral-500">{alternative.explanation}</span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      {entry.status === 'offered' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void handleOfferResponse(entry, 'accept')}
                            isLoading={busy}
                            disabled={busy}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOfferResponse(entry, 'decline')}
                            disabled={busy}
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </Button>
                        </>
                      )}
                      {ACTIONABLE_STATUSES.includes(entry.status) && entry.status !== 'offered' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleLeave(entry)}
                          isLoading={busy}
                          disabled={busy}
                        >
                          Leave list
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
