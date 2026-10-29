import { Alert, Card, PageHeader } from '@/components/ui'

export function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform audit history"
        subtitle="Historical administrative events require a persisted, access-controlled audit source."
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Audit history' },
        ]}
      />
      <Alert variant="warning" title="Audit history is not connected">
        This deployment does not define an audit-event table or backend audit API. No sample
        events, internal credentials, or source metadata are displayed. Connect a protected,
        persisted audit service before using this page for administrative review.
      </Alert>
      <Card>
        <p className="text-sm text-neutral-600">
          This interface does not allow historical events to be edited. Actor, action, target,
          before-and-after values, filters, and pagination will appear only when authorised
          backend records are available.
        </p>
      </Card>
    </div>
  )
}
