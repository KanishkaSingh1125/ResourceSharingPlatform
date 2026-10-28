import { Card } from '@/components/ui'

export function OrgResourcesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage your organisation's listed equipment, spaces, and tools.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Resource management will be available once the backend is connected.
        </p>
      </Card>
    </div>
  )
}

