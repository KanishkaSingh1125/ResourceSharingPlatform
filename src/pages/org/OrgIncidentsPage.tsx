import { AlertTriangle } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/ui'

export function OrgIncidentsPage() {
  return (
    <div>
      <PageHeader
        title="Incident Reports"
        subtitle="Safety notices, equipment failures, protocol infractions, and maintenance requests."
        badge={<Badge variant="default">0 Active Incidents</Badge>}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Incident Reports' },
        ]}
      />

      <EmptyState
        icon={<AlertTriangle className="h-6 w-6 text-neutral-400" />}
        title="Zero Safety or Equipment Incidents"
        description="No hardware faults or safety breaches have been reported across your organisation's active resources."
        compact
      />
    </div>
  )
}

