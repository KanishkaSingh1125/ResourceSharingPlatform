import { Card } from '@/components/ui'

export function OrgWorkspace() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Workspace</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Your organisation's overview — resources, bookings, and member activity.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-neutral-500">Listed Resources</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Pending Requests</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Active Users</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
      </div>
    </div>
  )
}

