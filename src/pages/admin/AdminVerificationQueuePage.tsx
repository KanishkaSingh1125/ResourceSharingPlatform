import { CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui'

export function AdminVerificationQueuePage() {
  return (
    <div>
      <PageHeader
        title="Organisation Verification Queue"
        subtitle="Review, audit, and approve new educational, laboratory, and corporate organisations requesting platform membership."
        badge={<Badge variant="warning" showDot>5 Pending Verifications</Badge>}
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Verification Queue' },
        ]}
      />

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>MOU / Accreditation</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold text-xs text-neutral-900">
                AIIMS Computational Biology Unit
              </TableCell>
              <TableCell className="text-xs">Medical Research Lab</TableCell>
              <TableCell className="text-xs">
                <span className="text-brand-600 font-medium">Govt_Clearance_2026.pdf</span>
              </TableCell>
              <TableCell className="text-xs text-neutral-500">2 days ago</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="xs">
                  <XCircle className="h-3.5 w-3.5 text-neutral-500" />
                  Decline
                </Button>
                <Button variant="primary" size="xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
