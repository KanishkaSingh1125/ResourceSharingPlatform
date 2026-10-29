import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, Building2, MapPin, Search } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { createBooking, joinWaitingList } from '@/features/bookings'
import { getCategories, searchResources } from '@/features/resources'
import type { Resource, ResourceCategory } from '@/types'

const PAGE_SIZE = 12

export function DiscoverPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [purpose, setPurpose] = useState('')
  const idempotencyKey = useRef(crypto.randomUUID())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [resourceResult, categoryResult] = await Promise.all([
      searchResources({
        query,
        category_id: categoryId || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy: 'created_at',
        sortOrder: 'desc',
      }),
      getCategories(),
    ])
    if (resourceResult.error || categoryResult.error) {
      setError([resourceResult.error, categoryResult.error].filter(Boolean).join(' '))
    }
    setResources(resourceResult.data)
    setCount(resourceResult.count)
    setHasMore(resourceResult.hasMore)
    setCategories(categoryResult.data)
    setLoading(false)
  }, [categoryId, page, query])

  useEffect(() => { void load() }, [load])

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedResource) return
    const starts = new Date(startsAt)
    const ends = new Date(endsAt)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || starts <= new Date() || ends <= starts) {
      setError('Choose a future start and an end time after the start.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await createBooking({
      resource_id: selectedResource.id,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      purpose: purpose.trim(),
      idempotency_key: idempotencyKey.current,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Booking request could not be completed.')
      return
    }
    setNotice(result.idempotent
      ? 'This request was already submitted; the existing booking was returned.'
      : 'Booking request submitted. The database will enforce availability and eligibility.')
    setSelectedResource(null)
    setPurpose('')
    idempotencyKey.current = crypto.randomUUID()
  }

  async function submitWaitlist(resource: Resource) {
    const starts = new Date(startsAt)
    const ends = new Date(endsAt)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || starts <= new Date() || ends <= starts) {
      setError('Choose a future start and an end time after the start before joining the waitlist.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await joinWaitingList({
      resource_id: resource.id,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice('You have joined the waitlist for the selected time slot.')
  }

  function chooseResource(resource: Resource) {
    idempotencyKey.current = crypto.randomUUID()
    setSelectedResource(resource)
    setError(null)
    setNotice(null)
    setStartsAt('')
    setEndsAt('')
    setPurpose('')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Discover resources</h1>
      <p className="mt-1 text-sm text-neutral-600">Search published resources from approved organisations and request a real booking.</p>
      <form onSubmit={event => { event.preventDefault(); setPage(1); void load() }} className="mt-5 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_220px_auto]">
        <label className="text-sm font-medium text-neutral-700">
          Search
          <span className="mt-1 flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2">
            <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <input maxLength={100} value={query} onChange={event => setQuery(event.target.value)}
              className="min-w-0 flex-1 outline-none" />
          </span>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Category
          <select value={categoryId} onChange={event => { setCategoryId(event.target.value); setPage(1) }}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
            <option value="">All categories</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={loading}><Search className="h-4 w-4" aria-hidden="true" />Search</Button>
        </div>
      </form>

      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      {selectedResource && (
        <Card className="mt-4 border-brand-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Request {selectedResource.name}</h2>
              <p className="mt-1 text-sm text-neutral-600">Availability, eligibility, capacity, holds and conflicts are rechecked transactionally by the backend.</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedResource(null)}>Close</Button>
          </div>
          <form onSubmit={event => void submitBooking(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700">Start
              <input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">End
              <input type="datetime-local" required value={endsAt} onChange={event => setEndsAt(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700 sm:col-span-2">Purpose
              <textarea maxLength={1000} rows={2} value={purpose} onChange={event => setPurpose(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Request booking'}</Button>
              <Button type="button" variant="outline" disabled={saving}
                onClick={() => void submitWaitlist(selectedResource)}>
                Join waitlist for this time
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-5" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading approved resource listings…</Card>
        ) : resources.length === 0 ? (
          <Card className="py-10 text-center text-sm text-neutral-600">No published resources match this search.</Card>
        ) : (
          <>
            <p className="mb-3 text-sm text-neutral-500">{count} resources found</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {resources.map(resource => (
                <Card key={resource.id} className="flex h-full flex-col">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-semibold text-neutral-900">{resource.name}</h2>
                      {resource.resource_categories?.name && <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{resource.resource_categories.name}</span>}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{resource.description || 'No description provided.'}</p>
                    <div className="mt-3 space-y-1 text-sm text-neutral-600">
                      {resource.organisations?.name && <p className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden="true" />{resource.organisations.name}</p>}
                      {resource.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />{resource.location}</p>}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-neutral-100 pt-3">
                    <p className="text-xs text-neutral-500">{resource.resource_type} · Capacity {resource.capacity}</p>
                    <Button type="button" className="mt-3 w-full" size="sm" onClick={() => chooseResource(resource)}>
                      Request or waitlist
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {(page > 1 || hasMore) && (
              <div className="mt-5 flex items-center justify-between">
                <Button type="button" variant="outline" disabled={page === 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</Button>
                <span className="text-sm text-neutral-600">Page {page}</span>
                <Button type="button" variant="outline" disabled={!hasMore || loading} onClick={() => setPage(current => current + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
