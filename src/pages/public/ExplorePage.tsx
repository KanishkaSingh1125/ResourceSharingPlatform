import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import {
  ResourceCard,
  Badge,
  Button,
  Tabs,
  Modal,
  SearchBar,
  SkeletonCard,
  EmptyState,
} from '@/components/ui'
import { getResources } from '@/services/resourceService'
import { type Resource, type ResourceCategory } from '@/types/resource'

const CATEGORY_TABS = [
  { id: 'all', label: 'All Equipment' },
  { id: 'Laboratories', label: 'Laboratories' },
  { id: 'Computers & High-Compute', label: 'Computing' },
  { id: 'Fabrication & 3D Printing', label: 'Fabrication' },
  { id: 'Cameras & Imaging', label: 'Imaging' },
  { id: 'Testing & Measurement', label: 'Testing' },
  { id: 'Meeting & Event Spaces', label: 'Spaces' },
  { id: 'Chemical & Bio Processing', label: 'Bio-Processing' },
]

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialQuery = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || 'all'

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)

  // Fetch actual resources via service layer
  useEffect(() => {
    let isMounted = true

    getResources({
      search: searchQuery,
      category: selectedCategory !== 'all' ? (selectedCategory as ResourceCategory) : undefined,
      limit: 12,
    })
      .then((res) => {
        if (!isMounted) return
        setResources(res.items)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load explore resources:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [searchQuery, selectedCategory])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    const params = new URLSearchParams(searchParams)
    if (val.trim()) {
      params.set('q', val.trim())
    } else {
      params.delete('q')
    }
    setSearchParams(params)
  }

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    const params = new URLSearchParams(searchParams)
    if (cat !== 'all') {
      params.set('category', cat)
    } else {
      params.delete('category')
    }
    setSearchParams(params)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSearchParams(new URLSearchParams())
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="primary" showDot size="sm">
            Live Shared Catalog
          </Badge>
          <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-medium">
            Multi-Tenant PostgreSQL Architecture
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Explore Shared Resources
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Discover specialized equipment, laboratories, compute clusters, and testing instruments
          offered by verified universities and research institutions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl">
        <SearchBar
          placeholder="Search resources, organisations, equipment, locations..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Category Tabs */}
      <Tabs
        tabs={CATEGORY_TABS}
        activeTab={selectedCategory}
        onChange={handleCategoryChange}
        variant="pill"
      />

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-200/80 pb-3">
        <span>
          Showing <strong className="text-neutral-800">{resources.length}</strong> verified resources
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        <span className="flex items-center gap-1 text-brand-600 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI-Assisted Matching Active</span>
        </span>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <ResourceCard
              key={res.id}
              id={res.id}
              title={res.title}
              category={res.category}
              organisationName={res.organisationName}
              isOrgVerified={res.isOrgVerified}
              location={`${res.location.building}, ${res.location.city}`}
              availabilityStatus={res.availabilityStatus}
              accessLevel={res.accessLevel}
              rate={`$${res.rate.amount}/${res.rate.unit}`}
              imageUrl={res.images[0]}
              onViewDetails={() => setSelectedResource(res)}
              onRequestAccess={() => setSelectedResource(res)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No resources found"
          description="No equipment matched your current search filters. Try adjusting your search query or exploring other categories."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      )}

      {/* Detail Preview Modal */}
      {selectedResource && (
        <Modal
          isOpen={Boolean(selectedResource)}
          onClose={() => setSelectedResource(null)}
          title={selectedResource.title}
          description={`Hosted by ${selectedResource.organisationName} • ${selectedResource.location.city}`}
          size="lg"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedResource(null)}>
                Close
              </Button>
              <Link to="/join">
                <Button variant="primary" size="sm">
                  Join Consortium to Request Access
                </Button>
              </Link>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-neutral-700 leading-relaxed text-sm">
              {selectedResource.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
                <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                  Category
                </span>
                <span className="font-semibold text-neutral-800 text-sm">
                  {selectedResource.category}
                </span>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
                <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                  Access Rate
                </span>
                <span className="font-semibold text-neutral-800 text-sm">
                  ${selectedResource.rate.amount}/{selectedResource.rate.unit}
                </span>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
                <span className="text-[10px] uppercase text-neutral-400 font-bold block">
                  Availability
                </span>
                <span className="font-semibold text-emerald-700 text-sm capitalize">
                  {selectedResource.availabilityStatus}
                </span>
              </div>
            </div>

            {selectedResource.requiredCredentials.length > 0 && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                <span className="font-semibold text-neutral-900 block">Prerequisites on File:</span>
                <p className="text-neutral-600">
                  {selectedResource.requiredCredentials.join(', ')}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}
