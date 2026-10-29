import { Alert, Card, PageHeader } from '@/components/ui'

export function OrgAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sharing impact"
        subtitle="Impact metrics must be calculated from persisted usage data and a documented measurement period."
        breadcrumbs={[
          { label: 'Organisation', to: '/org' },
          { label: 'Sharing impact' },
        ]}
      />
      <Alert variant="warning" title="Impact data is not available">
        This deployment does not expose an organisation-scoped analytics or usage aggregation
        service. Utilisation before and after sharing, avoided costs, additional access, and time
        saved are not displayed until their source data and calculation rules are available.
      </Alert>
      <Card>
        <p className="text-sm text-neutral-600">
          No zero-valued measurements or fabricated chart series are shown. A published metric
          must include its definition, measurement period, source, and whether it is measured or
          estimated.
        </p>
      </Card>
    </div>
  )
}
