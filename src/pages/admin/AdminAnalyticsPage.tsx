import { Alert, Card, PageHeader } from '@/components/ui'

export function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform analytics"
        subtitle="Platform-wide metrics require a protected backend aggregation service."
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Analytics' },
        ]}
      />
      <Alert variant="warning" title="Analytics data is not connected">
        This deployment does not expose a platform analytics service. No sample charts or
        placeholder metrics are presented as actual results.
      </Alert>
      <Card>
        <p className="text-sm text-neutral-600">
          Configure authorised aggregate queries with documented definitions and measurement
          periods before using this page for operational or impact reporting.
        </p>
      </Card>
    </div>
  )
}
