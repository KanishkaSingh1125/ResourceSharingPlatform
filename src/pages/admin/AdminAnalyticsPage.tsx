import { Card } from '@/components/ui'

export function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Platform Analytics</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Platform-wide usage, growth, and resource utilisation metrics.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Platform analytics (Recharts) will render here once data is available.
        </p>
      </Card>
    </div>
  )
}

