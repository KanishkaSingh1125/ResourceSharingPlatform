import { Card } from '@/components/ui'

export function AdminOrgsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Organisations</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Review, verify, and manage registered organisations.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Organisation management will be available once the admin backend is connected.
        </p>
      </Card>
    </div>
  )
}

