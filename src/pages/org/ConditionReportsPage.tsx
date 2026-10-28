import { FileText } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/ui'

export function ConditionReportsPage() {
  return (
    <div>
      <PageHeader
        title="Equipment Condition Reports"
        subtitle="Pre-session and post-session condition checklists submitted during user check-ins and check-outs."
        badge={<Badge variant="success">All Equipment Nominal</Badge>}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Condition Reports' },
        ]}
      />

      <EmptyState
        icon={<FileText className="h-6 w-6 text-brand-600" />}
        title="No Flagged Condition Discrepancies"
        description="All recent check-in/check-out QR scans confirmed normal operating status. Routine calibration reports will appear here."
        compact
      />
    </div>
  )
}

