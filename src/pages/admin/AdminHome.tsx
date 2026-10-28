import { Card } from '@/components/ui'

export function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Platform-wide overview for administrators.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-neutral-500">Total Organisations</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Active Bookings</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Pending Approvals</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
      </div>
    </div>
  )
}

