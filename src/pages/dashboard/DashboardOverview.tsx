import { Card } from '@/components/ui'

export function DashboardOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Your personal overview of bookings, recommendations, and activity.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-neutral-500">Active Bookings</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Pending Requests</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500">Resources Used</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">—</p>
        </Card>
      </div>

      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Dashboard data will populate once the Supabase backend is connected.
        </p>
      </Card>
    </div>
  )
}

