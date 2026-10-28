import { PageHeader, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'

export function AdminAuditLogsPage() {
  return (
    <div>
      <PageHeader
        title="Platform Global Audit Logs"
        subtitle="Immutable security event logs covering admin approvals, permission elevation, and authentication events."
        badge={<Badge variant="error">Audit Trail Active</Badge>}
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Audit Logs' },
        ]}
      />

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp (UTC)</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>IP / Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs text-neutral-500">
                2026-10-28 06:12:44
              </TableCell>
              <TableCell className="font-medium text-xs">Platform Custodian</TableCell>
              <TableCell className="text-xs">POLICY_UPDATE_RLS</TableCell>
              <TableCell className="text-xs font-mono text-neutral-600">table:bookings</TableCell>
              <TableCell className="font-mono text-xs text-neutral-400">10.0.4.12</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
