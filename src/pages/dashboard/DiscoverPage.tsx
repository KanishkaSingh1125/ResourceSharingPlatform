import { Card } from '@/components/ui'

export function DiscoverPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Discover Resources</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Search and filter resources shared by verified organisations.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Resource discovery with AI-assisted matching will be available once the backend is integrated.
        </p>
      </Card>
    </div>
  )
}

