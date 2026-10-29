import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Building2, MapPin, RefreshCw, Search } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { searchResources } from '@/features/resources'
import { useAuth } from '@/lib/AuthContext'
import type { Resource } from '@/types'

const PAGE_SIZE = 12

interface SearchResult {
  requestKey: string
  data: Resource[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
  error: string | null
}

export function ExplorePage() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [result, setResult] = useState<SearchResult | null>(null)
  const [draftQuery, setDraftQuery] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const requestKey = JSON.stringify([userId, query, page, retry])
  const currentResult = result?.requestKey === requestKey ? result : null
  const resources = currentResult?.data ?? []
  const count = currentResult?.count ?? 0
  const hasMore = currentResult?.hasMore ?? false
  const error = currentResult?.error ?? null
  const loading = authLoading || Boolean(userId && !currentResult)

  useEffect(() => {
    if (authLoading || !userId) return

    let active = true
    void searchResources({ query, page, pageSize: PAGE_SIZE })
      .then(searchResult => {
        if (active) setResult({ requestKey, ...searchResult })
      })
      .catch(requestError => {
        if (!active) return
        setResult({
          requestKey,
          data: [],
          count: 0,
          page,
          pageSize: PAGE_SIZE,
          hasMore: false,
          error: requestError instanceof Error ? requestError.message : 'Could not load resources.',
        })
      })

    return () => {
      active = false
    }
  }, [authLoading, userId, query, page, retry, requestKey])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery(draftQuery.trim())
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">Explore Resources</h1>
      <p className="mt-2 text-neutral-600">
        Discover equipment, spaces, and tools shared by verified organisations.
      </p>

      <form onSubmit={submitSearch} className="mt-8 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 text-neutral-400" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search resource names or descriptions..."
          value={draftQuery}
          onChange={event => setDraftQuery(event.target.value)}
          aria-label="Search resources"
          maxLength={100}
          className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={authLoading || !userId || loading}>
          Search
        </Button>
      </form>

      <div className="mt-8" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <Card className="py-12 text-center text-sm text-neutral-600">Loading resources...</Card>
        ) : !userId ? (
          <Card className="py-10 text-center">
            <p className="font-medium text-neutral-900">Sign in to browse resources</p>
            <p className="mt-2 text-sm text-neutral-600">
              Resource listings are available to authenticated users.
            </p>
            <Link to="/login" className="mt-5 inline-flex">
              <Button>Sign in</Button>
            </Link>
          </Card>
        ) : error ? (
          <Card className="flex flex-col items-start gap-3 border-red-200 bg-red-50 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Could not load resources</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </Card>
        ) : resources.length === 0 ? (
          <Card className="py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-neutral-700">
              {query ? 'No resources match your search.' : 'No approved resources are available yet.'}
            </p>
          </Card>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-600">
              {count} {count === 1 ? 'resource' : 'resources'} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map(resource => (
                <Card key={resource.id} className="flex h-full flex-col">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-neutral-900">{resource.name}</h2>
                      {resource.resource_categories?.name && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                          {resource.resource_categories.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-neutral-600">
                      {resource.description || 'No description provided.'}
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-neutral-600">
                      {resource.organisations?.name && (
                        <p className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {resource.organisations.name}
                        </p>
                      )}
                      {resource.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {resource.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-5 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                    {resource.resource_type === 'shared' ? 'Shared' : 'Exclusive'}
                    {' · '}Capacity {resource.capacity}
                  </p>
                </Card>
              ))}
            </div>
            {(page > 1 || hasMore) && (
              <div className="mt-6 flex items-center justify-between">
                <Button type="button" variant="outline" disabled={page === 1 || loading}
                  onClick={() => setPage(current => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <span className="text-sm text-neutral-600">Page {page}</span>
                <Button type="button" variant="outline" disabled={!hasMore || loading}
                  onClick={() => setPage(current => current + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}