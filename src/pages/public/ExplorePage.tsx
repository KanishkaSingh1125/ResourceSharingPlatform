import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search,
  Filter,
  Microscope,
  Cpu,
  Camera,
  Layers,
  Gauge,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import {
  ResourceCard,
  type ResourceAvailability,
  Badge,
  Button,
  Tabs,
  Modal,
} from '@/components/ui'

interface ResourceItem {
  id: string
  title: string
  category: string
  categoryKey: string
  organisationName: string
  isOrgVerified: boolean
  location: string
  availabilityStatus: ResourceAvailability
  accessLevel: 'open' | 'members_only' | 'approval_required'
  rate: string
  iconType: typeof Microscope
  description: string
}

const ALL_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    title: 'Class 100 ISO 5 Cleanroom Facility',
    category: 'Laboratories',
    categoryKey: 'laboratories',
    organisationName: 'IIT Delhi Nanotech Center',
    isOrgVerified: true,
    location: 'Hauz Khas, New Delhi',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: '₹1,200 / hr',
    iconType: Microscope,
    description: 'Sub-micron photolithography, wafer cleaning, and deposition bays.',
  },
  {
    id: 'res-2',
    title: 'NVIDIA DGX H100 8-GPU Compute Node',
    category: 'Computers & High-Compute',
    categoryKey: 'computers',
    organisationName: 'AI Frontier Lab, Bangalore',
    isOrgVerified: true,
    location: 'Whitefield, Bangalore',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: 'Compute Credits',
    iconType: Cpu,
    description: 'Dedicated LLM training and distributed tensor parallelism node.',
  },
  {
    id: 'res-3',
    title: 'Formlabs Form 4L Industrial 3D Printer',
    category: 'Fabrication Equipment',
    categoryKey: 'fabrication',
    organisationName: 'MakerHive Community Lab',
    isOrgVerified: true,
    location: 'Indiranagar, Bangalore',
    availabilityStatus: 'available',
    accessLevel: 'open',
    rate: 'Material Costs Only',
    iconType: Layers,
    description: 'Stereolithography (SLA) biocompatible resin printing.',
  },
  {
    id: 'res-4',
    title: 'JEOL 200kV Field Emission Cryo-TEM',
    category: 'Cameras & Imaging',
    categoryKey: 'cameras',
    organisationName: 'Indian Institute of Science (IISc)',
    isOrgVerified: true,
    location: 'CV Raman Rd, Bangalore',
    availabilityStatus: 'reserved',
    accessLevel: 'approval_required',
    rate: 'Institutional Sharing',
    iconType: Camera,
    description: 'Sub-angstrom structural biology and macromolecular microscopy.',
  },
  {
    id: 'res-5',
    title: 'Keysight 50GHz Microwave Signal Analyzer',
    category: 'Testing Instruments',
    categoryKey: 'testing',
    organisationName: 'BITS Pilani RF Lab',
    isOrgVerified: true,
    location: 'Pilani, Rajasthan',
    availabilityStatus: 'available',
    accessLevel: 'approval_required',
    rate: '₹800 / hr',
    iconType: Gauge,
    description: 'Ka-band radar and 5G/6G beamforming characterization.',
  },
  {
    id: 'res-6',
    title: 'BioFlo 320 Bioreactor Fermentation System',
    category: 'Laboratories',
    categoryKey: 'laboratories',
    organisationName: 'BioGen Analytical Center',
    isOrgVerified: true,
    location: 'HITEC City, Hyderabad',
    availabilityStatus: 'maintenance',
    accessLevel: 'approval_required',
    rate: 'Project Grant Sponsored',
    iconType: Microscope,
    description: 'Continuous culture microbial and mammalian cell line expression.',
  },
]

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || 'all'

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params: Record<string, string> = {}
    if (searchQuery.trim()) params.q = searchQuery.trim()
    if (selectedCategory !== 'all') params.category = selectedCategory
    setSearchParams(params)
  }

  const filteredResources = useMemo(() => {
    return ALL_RESOURCES.filter((res) => {
      const matchesCategory =
        selectedCategory === 'all' || res.categoryKey === selectedCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        res.title.toLowerCase().includes(q) ||
        res.category.toLowerCase().includes(q) ||
        res.organisationName.toLowerCase().includes(q) ||
        res.location.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q)

      return matchesCategory && matchesQuery
    })
  }, [selectedCategory, searchQuery])

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="primary" showDot size="sm">
            Live Catalog
          </Badge>
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 font-medium">
            Demonstration Data (Backend Pending)
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Explore Shared Resources
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Discover specialized equipment, laboratories, compute clusters, and testing instruments
          across verified institutions.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources, organisations, equipment, locations..."
            className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <Button type="submit" size="md" className="rounded-xl shrink-0">
          Search
        </Button>
      </form>

      {/* Category Tabs */}
      <Tabs
        tabs={[
          { id: 'all', label: 'All Equipment', count: ALL_RESOURCES.length },
          { id: 'laboratories', label: 'Laboratories', count: 2 },
          { id: 'computers', label: 'Computing', count: 1 },
          { id: 'fabrication', label: 'Fabrication', count: 1 },
          { id: 'cameras', label: 'Imaging', count: 1 },
          { id: 'testing', label: 'Testing', count: 1 },
        ]}
        activeTab={selectedCategory}
        onChange={(cat) => {
          setSelectedCategory(cat)
          const params: Record<string, string> = {}
          if (searchQuery.trim()) params.q = searchQuery.trim()
          if (cat !== 'all') params.category = cat
          setSearchParams(params)
        }}
        variant="pill"
      />

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-200/80 pb-3">
        <span>
          Showing <strong className="text-neutral-800">{filteredResources.length}</strong> matching resources
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        <span className="flex items-center gap-1 text-brand-600 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI-Assisted Matching Active</span>
        </span>
      </div>

      {/* Resources Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const Icon = res.iconType
            return (
              <ResourceCard
                key={res.id}
                id={res.id}
                title={res.title}
                category={res.category}
                organisationName={res.organisationName}
                isOrgVerified={res.isOrgVerified}
                location={res.location}
                availabilityStatus={res.availabilityStatus}
                accessLevel={res.accessLevel}
                rate={res.rate}
                icon={<Icon className="h-8 w-8 text-brand-600" />}
                onViewDetails={() => setSelectedResource(res)}
                onRequestAccess={() => setSelectedResource(res)}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <Filter className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">No resources found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            No equipment matched your current search filters. Try adjusting your query or resetting category selection.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setSearchParams({})
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResource && (
        <Modal
          isOpen={Boolean(selectedResource)}
          onClose={() => setSelectedResource(null)}
          title={selectedResource.title}
          description={`Hosted by ${selectedResource.organisationName} • ${selectedResource.location}`}
          size="lg"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedResource(null)}>
                Close
              </Button>
              <Link to="/join">
                <Button variant="primary" size="sm">
                  Join to Request Access
                </Button>
              </Link>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Demonstration Preview Listing:</strong> Full reservation lifecycle will connect to
                Supabase Auth and Row Level Security when backend configuration is populated.
              </span>
            </div>

            <p className="text-neutral-700 leading-relaxed text-sm">
              {selectedResource.description}
            </p>

            <div className="grid grid-cols-2 gap-3">
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
                  Access Fee / Rate
                </span>
                <span className="font-semibold text-neutral-800 text-sm">
                  {selectedResource.rate}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
