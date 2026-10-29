import { Alert, Card, PageHeader } from '@/components/ui'

export function OrgAuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity & audit history"
        subtitle="Historical events are shown only when they are available from the authorised audit service."
        breadcrumbs={[
          { label: 'Organisation', to: '/org' },
          { label: 'Audit history' },
        ]}
      />
      <Alert variant="warning" title="Audit history is not connected">
        This deployment does not define an audit-event table or backend audit API. No sample
        events are displayed; historical activity cannot be reviewed until the backend exposes
        persisted records with organisation-scoped access controls.
      </Alert>
      <Card>
        <p className="text-sm text-neutral-600">
          Audit records are immutable and cannot be changed through this interface. Filters and
          pagination will be available when an authorised audit source is configured.
        </p>
      </Card>
    </div>
  )
}
