import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { Alert, Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { getReports } from '@/services/reportIncidentService'
import { type ConditionOrIncidentReport } from '@/types/reportIncident'

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function ConditionReportsPage() {
  const [reports, setReports] = useState<ConditionOrIncidentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getReports({ type: 'condition_report' })
      .then((items) => {
        if (active) setReports(items)
      })
      .catch((error) => {
        if (active) setErrorText(error instanceof Error ? error.message : 'Reports could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const differences = reports.reduce((count, report) => {
    if (report.conditionReport?.phase !== 'post_use') return count
    const pre = reports.find(
      (candidate) =>
        candidate.bookingId === report.bookingId &&
        candidate.conditionReport?.phase === 'pre_use'
    )
    if (!pre?.conditionReport) return count
    const before = pre.conditionReport
    const after = report.conditionReport
    return count + Number(
      before.rating !== after.rating ||
      before.missingAccessories !== after.missingAccessories ||
      before.visibleDamage !== after.visibleDamage ||
      before.abnormalConditions !== after.abnormalConditions
    )
  }, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment Condition Reports"
        subtitle="Persisted pre-use and post-use inspections, visible only to users permitted by backend policy."
        badge={<Badge variant={differences ? 'warning' : 'default'}>{differences} Reported differences</Badge>}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Condition Reports' },
        ]}
      />
      {errorText && <Alert variant="error" title="Condition reports unavailable">{errorText}</Alert>}
      <Alert variant="info" title="Evidence uploads are disabled">
        This deployment does not expose a configured private evidence-storage workflow. Existing
        reports are shown from Supabase; image data is not stored as public URLs.
      </Alert>
      {loading ? (
        <Card><p className="text-sm text-neutral-500">Loading persisted condition reports…</p></Card>
      ) : reports.length === 0 && !errorText ? (
        <EmptyState
          icon={<FileText className="h-6 w-6 text-brand-600" />}
          title="No condition reports"
          description="Reports will appear here after an authorised booking participant submits an inspection."
          compact
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">{report.resourceTitle}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{report.title} · Booking {report.bookingId || 'not linked'}</p>
                </div>
                <Badge variant={report.conditionReport?.rating === 'poor' ? 'error' : 'default'}>
                  {report.conditionReport?.rating || report.status}
                </Badge>
              </div>
              {report.conditionReport ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Detail label="Inspection" value={report.conditionReport.phase === 'pre_use' ? 'Before use' : 'After use'} />
                  <Detail label="Submitted" value={formatTime(report.createdAt)} />
                  <Detail label="Notes" value={report.conditionReport.notes || 'None'} />
                  <Detail label="Missing accessories" value={report.conditionReport.missingAccessories || 'None reported'} />
                  <Detail label="Visible damage" value={report.conditionReport.visibleDamage || 'None reported'} />
                  <Detail label="Abnormal operating conditions" value={report.conditionReport.abnormalConditions || 'None reported'} />
                </div>
              ) : <p className="mt-3 text-sm text-neutral-700">{report.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{value}</p>
    </div>
  )
}
