import { Card } from '@/components/ui'

export function OrgAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Usage trends, resource utilisation, and booking statistics.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Charts powered by Recharts will render here once analytics data is available.
        </p>
      </Card>
    </div>
  )
}

