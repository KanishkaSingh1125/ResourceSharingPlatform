import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

interface ActivityEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

const PAGE_SIZE = 25

export function ActivityPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [filter, setFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      setEntries([])
      setCount(0)
      return
    }
    setLoading(true)
    setError(null)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from('audit_log')
      .select('id, actor_id, action, entity_type, entity_id, created_at', { count: 'exact' })
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)
    const safeFilter = filter.trim().replace(/[(),%_]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
    if (safeFilter) query = query.ilike('action', `%${safeFilter}%`)
    if (fromDate) query = query.gte('created_at', new Date(`${fromDate}T00:00:00.000Z`).toISOString())
    if (toDate) {
      const endExclusive = new Date(`${toDate}T00:00:00.000Z`)
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
      query = query.lt('created_at', endExclusive.toISOString())
    }
    const { data, count: resultCount, error: queryError } = await query
    if (queryError) {
      setError(queryError.message)
      setEntries([])
      setCount(0)
    } else {
      setEntries((data ?? []) as ActivityEntry[])
      setCount(resultCount ?? 0)
    }
    setLoading(false)
  }, [filter, fromDate, page, toDate, user])

  useEffect(() => { void load() }, [load])

  function updateFilter(value: string) {
    setPage(1)
    setFilter(value)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Activity history</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Audit events the database permits you to view. This list is read-only and limited to events attributed to your account.
      </p>
      <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        The current audit schema does not record a uniform outcome field or provide an integrity-proof mechanism. Events shown here are recorded history, not a claim of tamper-proofing.
      </p>

      <Card className="mt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-neutral-700">
            Action contains
            <input value={filter} maxLength={80} onChange={event => updateFilter(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            From
            <input type="date" value={fromDate} onChange={event => { setPage(1); setFromDate(event.target.value) }}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            To
            <input type="date" value={toDate} min={fromDate || undefined}
              onChange={event => { setPage(1); setToDate(event.target.value) }}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        </div>
      </Card>

      <div className="mt-4 text-sm text-neutral-500" aria-live="polite">
        {count} {count === 1 ? 'event' : 'events'}
      </div>
      <div className="mt-3 space-y-3" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading activity history…</Card>
        ) : error ? (
          <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-800">
            <p className="font-semibold">Could not load activity history</p>
            <p className="mt-1 break-words">{error}</p>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="py-10 text-center text-sm text-neutral-600">No permitted audit events match these filters.</Card>
        ) : entries.map(entry => (
          <Card key={entry.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-neutral-900">{humanize(entry.action)}</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {humanize(entry.entity_type)}
                {entry.entity_id ? ` · ${entry.entity_id}` : ''}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Outcome: event recorded · Actor: you</p>
            </div>
            <time className="shrink-0 text-xs text-neutral-500" dateTime={entry.created_at}>
              {formatDate(entry.created_at)}
            </time>
          </Card>
        ))}
      </div>
      {(page > 1 || count > page * PAGE_SIZE) && !error && (
        <div className="mt-5 flex items-center justify-between">
          <button type="button" className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            disabled={page === 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</button>
          <span className="text-sm text-neutral-600">Page {page}</span>
          <button type="button" className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            disabled={count <= page * PAGE_SIZE || loading} onClick={() => setPage(current => current + 1)}>Next</button>
        </div>
      )}
      <p className="mt-5 text-xs text-neutral-500">
        Manage records in <Link className="text-brand-700 underline" to="/dashboard/bookings">bookings</Link> or review sharing in <Link className="text-brand-700 underline" to="/dashboard/trust">Trust Passport</Link>.
      </p>
    </div>
  )
}

function humanize(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
