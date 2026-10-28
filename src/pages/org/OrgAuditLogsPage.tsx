import { PageHeader, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui'

export function OrgAuditLogsPage() {
  return (
    <div>
      <PageHeader
        title="Activity & Audit Logs"
        subtitle="Immutable timestamped log of booking submissions, access approvals, check-ins, and permission changes."
        badge={<Badge variant="primary">Real-time Stream</Badge>}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Audit Logs' },
        ]}
      />

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp (IST)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs text-neutral-500">
                2026-10-28 11:42
              </TableCell>
              <TableCell className="font-medium text-xs">Prof. Alan Turing</TableCell>
              <TableCell className="text-xs">Approved Booking #BK-4091</TableCell>
              <TableCell className="text-xs text-neutral-600">JEOL 200kV Cryo-TEM</TableCell>
              <TableCell>
                <Badge variant="success" size="sm">Success</Badge>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-mono text-xs text-neutral-500">
                2026-10-28 09:15
              </TableCell>
              <TableCell className="font-medium text-xs">Marcus Vance</TableCell>
              <TableCell className="text-xs">Updated Slot Availability</TableCell>
              <TableCell className="text-xs text-neutral-600">Class 100 Cleanroom</TableCell>
              <TableCell>
                <Badge variant="info" size="sm">Config</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
