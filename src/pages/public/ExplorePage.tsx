import { Search } from 'lucide-react'
import { Card } from '@/components/ui'

export function ExplorePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">Explore Resources</h1>
      <p className="mt-2 text-neutral-600">
        Discover equipment, spaces, and tools shared by verified organisations.
      </p>

      {/* Search bar placeholder */}
      <div className="mt-8 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-5 w-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search resources, organisations, or categories..."
          className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          disabled
        />
      </div>

      {/* Empty state */}
      <Card className="mt-10 text-center">
        <div className="py-12">
          <Search className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-4 text-sm font-medium text-neutral-600">
            Resource search is not yet connected
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Backend integration will power search, filtering, and AI-matched recommendations.
          </p>
        </div>
      </Card>
    </section>
  )
}

