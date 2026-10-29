import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  SlidersHorizontal,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  PageHeader,
  SearchBar,
  ResourceCard,
  Button,
  Select,
  Input,
  Pagination,
  SkeletonCard,
  EmptyState,
  Card,
  BackendStatusBanner,
} from '@/components/ui'
import { BookingModal } from '@/components/booking/BookingModal'
import { AlternativeFinder } from '@/components/booking/AlternativeFinder'
import { getResources } from '@/services/resourceService'
import { getAllOrganisations } from '@/services/organisationService'
import {
  type Resource,
  type ResourceCategory,
  type ResourceType,
  type ResourceAvailabilityStatus,
  type ResourceSortField,
} from '@/types/resource'
import { type Organisation } from '@/types/organisation'

const CATEGORIES: { label: string; value: ResourceCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Laboratories', value: 'Laboratories' },
  { label: 'Computers & High-Compute', value: 'Computers & High-Compute' },
  { label: 'Fabrication & 3D Printing', value: 'Fabrication & 3D Printing' },
  { label: 'Cameras & Imaging', value: 'Cameras & Imaging' },
  { label: 'Testing & Measurement', value: 'Testing & Measurement' },
  { label: 'Meeting & Event Spaces', value: 'Meeting & Event Spaces' },
  { label: 'Chemical & Bio Processing', value: 'Chemical & Bio Processing' },
]

const RESOURCE_TYPES: { label: string; value: ResourceType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Specialized Equipment', value: 'equipment' },
  { label: 'Laboratory Facility', value: 'lab' },
  { label: 'Compute & GPU Cluster', value: 'compute' },
  { label: 'Physical Space & Hall', value: 'space' },
  { label: 'Precision Tool', value: 'tool' },
]

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [, startTransition] = useTransition()

  // URL state synchronization
  const searchQuery = searchParams.get('q') || ''
  const categoryParam = (searchParams.get('category') as ResourceCategory | 'all') || 'all'
  const typeParam = (searchParams.get('type') as ResourceType | 'all') || 'all'
  const orgParam = searchParams.get('org') || 'all'
  const cityParam = searchParams.get('city') || ''
  const availabilityParam = (searchParams.get('status') as ResourceAvailabilityStatus | 'all') || 'all'
  const accessibleParam = searchParams.get('accessible') === 'true'
  const noCredsParam = searchParams.get('no_creds') === 'true'
  const sortByParam = (searchParams.get('sort') as ResourceSortField) || 'createdAt'
  const pageParam = parseInt(searchParams.get('page') || '1', 10)

  // Local search input for debouncing
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [prevQuery, setPrevQuery] = useState(searchQuery)
  if (prevQuery !== searchQuery) {
    setPrevQuery(searchQuery)
    setSearchInput(searchQuery)
  }
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)

  // Remote data state
  const [resources, setResources] = useState<Resource[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [organisations, setOrganisations] = useState<Organisation[]>([])

  // Booking modal state
  const [bookingResource, setBookingResource] = useState<Resource | null>(null)
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  // Debounced URL update for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput.trim()) {
            next.set('q', searchInput.trim())
          } else {
            next.delete('q')
          }
          next.set('page', '1')
          return next
        })
      }
    }, 300)

    return () => clearTimeout(handler)
  }, [searchInput, searchQuery, setSearchParams])

  // Fetch organisations for filter dropdown
  useEffect(() => {
    getAllOrganisations().then(setOrganisations).catch(console.error)
  }, [])

  // Fetch filtered resources from service layer
  useEffect(() => {
    let isMounted = true

    getResources({
      search: searchQuery,
      category: categoryParam,
      resourceType: typeParam,
      organisationId: orgParam !== 'all' ? orgParam : undefined,
      city: cityParam,
      availabilityStatus: availabilityParam !== 'all' ? availabilityParam : undefined,
      isAccessible: accessibleParam ? true : undefined,
      requiresNoSpecialCredentials: noCredsParam ? true : undefined,
      sortBy: sortByParam,
      page: pageParam,
      limit: 6,
    })
      .then((res) => {
        if (!isMounted) return
        setResources(res.items)
        setTotalItems(res.total)
        setTotalPages(res.totalPages)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load resources:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [
    searchQuery,
    categoryParam,
    typeParam,
    orgParam,
    cityParam,
    availabilityParam,
    accessibleParam,
    noCredsParam,
    sortByParam,
    pageParam,
  ])

  // Helper to update individual URL query params
  const updateFilter = (key: string, value: string | boolean | null) => {
    startTransition(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '' || value === 'all' || value === false) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
        next.set('page', '1') // reset page on filter change
        return next
      })
    })
  }

  const handleClearAllFilters = () => {
    setSearchInput('')
    setSearchParams(new URLSearchParams())
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (categoryParam !== 'all') count++
    if (typeParam !== 'all') count++
    if (orgParam !== 'all') count++
    if (cityParam) count++
    if (availabilityParam !== 'all') count++
    if (accessibleParam) count++
    if (noCredsParam) count++
    if (searchQuery) count++
    return count
  }, [
    categoryParam,
    typeParam,
    orgParam,
    cityParam,
    availabilityParam,
    accessibleParam,
    noCredsParam,
    searchQuery,
  ])

  const handleOpenBooking = (resourceId: string) => {
    const res = resources.find((r) => r.id === resourceId)
    if (res) {
      setBookingResource(res)
      setIsBookingOpen(true)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Backend connection banner */}
      <BackendStatusBanner />

      <PageHeader
        title="Discover Resources"
        subtitle="Search, audit, and reserve specialized equipment, cleanrooms, and computational pods from verified consortium organisations."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Discover Resources' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
              {totalItems} Resource{totalItems === 1 ? '' : 's'} available
            </span>
          </div>
        }
      />

      <AlternativeFinder
        onOpenResource={(resource) => {
          setBookingResource(resource)
          setIsBookingOpen(true)
        }}
      />

      {/* ── Search & Filter Control Bar ────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder="Search by keywords, specs, equipment model, or facility..."
              value={searchInput}
              onChange={setSearchInput}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Drawer Toggle (Mobile & Desktop) */}
            <Button
              variant={activeFilterCount > 0 ? 'subtle' : 'outline'}
              size="md"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            >
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-600 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Sort Selector */}
            <div className="w-44">
              <Select
                value={sortByParam}
                onChange={(e) => updateFilter('sort', e.target.value)}
                options={[
                  { value: 'createdAt', label: 'Recently Listed' },
                  { value: 'title', label: 'Name (A-Z)' },
                  { value: 'rate', label: 'Rate (Low to High)' },
                  { value: 'availability', label: 'Availability First' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = categoryParam === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => updateFilter('category', cat.value === 'all' ? null : cat.value)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors select-none ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Collapsible Extended Filter Panel ──────────────────── */}
      {showFiltersDrawer && (
        <Card className="border-brand-200 bg-neutral-50/50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Deep Discovery Filters
                </h4>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Filter 1: Resource Type */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Resource Type
                </label>
                <Select
                  value={typeParam}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  options={RESOURCE_TYPES}
                />
              </div>

              {/* Filter 2: Host Organisation */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Host Organisation
                </label>
                <Select
                  value={orgParam}
                  onChange={(e) => updateFilter('org', e.target.value)}
                  options={[
                    { value: 'all', label: 'All Verified Organisations' },
                    ...organisations.map((o) => ({
                      value: o.id,
                      label: `${o.name} (${o.type})`,
                    })),
                  ]}
                />
              </div>

              {/* Filter 3: Availability Status */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Availability Status
                </label>
                <Select
                  value={availabilityParam}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'available', label: 'Available Now' },
                    { value: 'in_use', label: 'In Use (Queueable)' },
                    { value: 'maintenance', label: 'Maintenance / Calibration' },
                  ]}
                />
              </div>

              {/* Filter 4: City / Location */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  City / Campus Region
                </label>
                <Input
                  placeholder="e.g. Cambridge, Boston, Oxford"
                  value={cityParam}
                  onChange={(e) => updateFilter('city', e.target.value)}
                />
              </div>
            </div>

            {/* Checkbox toggles */}
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-neutral-200/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={accessibleParam}
                  onChange={(e) => updateFilter('accessible', e.target.checked)}
                  className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Barrier-Free / ADA Accessible Facility Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={noCredsParam}
                  onChange={(e) => updateFilter('no_creds', e.target.checked)}
                  className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Open Access (No special lab certificates required)</span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ── Active Filters Tag Bar ────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400 font-medium">Applied:</span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              Query: "{searchQuery}"
              <X className="h-3 w-3 cursor-pointer hover:text-brand-900" onClick={() => updateFilter('q', null)} />
            </span>
          )}

          {categoryParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
              Category: {categoryParam}
              <X className="h-3 w-3 cursor-pointer hover:text-neutral-900" onClick={() => updateFilter('category', null)} />
            </span>
          )}

          {typeParam !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
              Type: {typeParam}
              <X className="h-3 w-3 cursor-pointer hover:text-neutral-900" onClick={() => updateFilter('type', null)} />
            </span>
          )}

          {cityParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
              City: {cityParam}
              <X className="h-3 w-3 cursor-pointer hover:text-neutral-900" onClick={() => updateFilter('city', null)} />
            </span>
          )}

          {accessibleParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Accessible Facility
              <X className="h-3 w-3 cursor-pointer hover:text-purple-900" onClick={() => updateFilter('accessible', null)} />
            </span>
          )}

          {noCredsParam && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              No Prerequisites
              <X className="h-3 w-3 cursor-pointer hover:text-emerald-900" onClick={() => updateFilter('no_creds', null)} />
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-[11px] text-neutral-500 hover:text-neutral-900 underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Resource Marketplace Grid ─────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="No Matching Resources Found"
          description={
            searchQuery || activeFilterCount > 0
              ? `We could not find any equipment matching your criteria. Try widening your filters, clearing search terms, or exploring other categories.`
              : 'No resources have been published by consortium organisations yet.'
          }
          actionLabel="Clear Filters"
          onAction={handleClearAllFilters}
          secondaryActionLabel="Browse All Laboratories"
          onSecondaryAction={() => updateFilter('category', 'Laboratories')}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((item) => (
              <ResourceCard
                key={item.id}
                id={item.id}
                title={item.title}
                category={item.category}
                organisationName={item.organisationName}
                isOrgVerified={item.isOrgVerified}
                location={`${item.location.building}, ${item.location.city}`}
                imageUrl={item.images[0]}
                availabilityStatus={item.availabilityStatus}
                accessLevel={item.accessLevel}
                rate={`$${item.rate.amount}/${item.rate.unit}`}
                onViewDetails={(id) => navigate(`/dashboard/resources/${id}`)}
                onRequestAccess={(id) => handleOpenBooking(id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4 flex justify-center">
              <Pagination
                currentPage={pageParam}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={6}
                onPageChange={(p) => updateFilter('page', String(p))}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Booking Workflow Modal ───────────────────────────── */}
      <BookingModal
        resource={bookingResource}
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false)
          setBookingResource(null)
        }}
      />
    </div>
  )
}
