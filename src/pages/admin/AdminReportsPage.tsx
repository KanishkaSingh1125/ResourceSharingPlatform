import { Card } from '@/components/ui'

export function AdminReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
      <p className="mt-1 text-sm text-neutral-500">
        User reports, flagged resources, and compliance issues.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Reporting and moderation tools will be available once the backend is connected.
        </p>
      </Card>
    </div>
  )
}

