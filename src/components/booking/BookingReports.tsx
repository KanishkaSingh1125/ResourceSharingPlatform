import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Card, Select, Textarea } from '@/components/ui'
import { createReport, getReports } from '@/services/reportIncidentService'
import { type Booking } from '@/types/booking'
import {
  type ConditionOrIncidentReport,
  type ConditionReportDetails,
  type ReportSeverity,
} from '@/types/reportIncident'

const EMPTY_CONDITION: ConditionReportDetails = {
  phase: 'pre_use',
  rating: 'good',
  notes: '',
  missingAccessories: '',
  visibleDamage: '',
  abnormalConditions: '',
  confirmed: false,
}

const severityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical — immediate safety concern' },
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function BookingReports({ booking }: { booking: Booking }) {
  const [reports, setReports] = useState<ConditionOrIncidentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [condition, setCondition] = useState<ConditionReportDetails>(EMPTY_CONDITION)
  const [category, setCategory] = useState('damage')
  const [severity, setSeverity] = useState<ReportSeverity>('medium')
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [incidentDescription, setIncidentDescription] = useState('')

  useEffect(() => {
    let active = true
    getReports({ bookingId: booking.id })
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
  }, [booking.id])

  const preUseSaved = reports.some(
    (report) => report.type === 'condition_report' && report.conditionReport?.phase === 'pre_use'
  )
  const postUseSaved = reports.some(
    (report) => report.type === 'condition_report' && report.conditionReport?.phase === 'post_use'
  )
  const preUseReport = reports.find(
    (report) => report.type === 'condition_report' && report.conditionReport?.phase === 'pre_use'
  )?.conditionReport
  const postUseReport = reports.find(
    (report) => report.type === 'condition_report' && report.conditionReport?.phase === 'post_use'
  )?.conditionReport
  const phase = preUseSaved ? 'post_use' : 'pre_use'
  const canFileReport = booking.status === 'approved' || booking.status === 'confirmed' ||
    booking.status === 'in_progress' || booking.status === 'completed'

  const submitCondition = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrorText(null)
    setNotice(null)
    try {
      const saved = await createReport({
        type: 'condition_report',
        resourceId: booking.resourceId,
        bookingId: booking.id,
        severity: condition.rating === 'poor' ? 'high' : condition.rating === 'fair' ? 'medium' : 'low',
        title: `${phase === 'pre_use' ? 'Pre-use' : 'Post-use'} condition report`,
        description: condition.notes.trim() || 'No additional notes.',
        conditionReport: { ...condition, phase, confirmed: true },
      })
      setReports((current) => [saved, ...current])
      setCondition({ ...EMPTY_CONDITION, phase })
      setNotice(`${phase === 'pre_use' ? 'Pre-use' : 'Post-use'} report saved to the booking.`)
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The condition report was not saved.')
    } finally {
      setSaving(false)
    }
  }

  const submitIncident = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrorText(null)
    setNotice(null)
    try {
      const saved = await createReport({
        type: 'incident_report',
        resourceId: booking.resourceId,
        bookingId: booking.id,
        severity,
        title: `${category.replaceAll('_', ' ')} report`,
        description: incidentDescription,
        category,
        incidentDate,
      })
      setReports((current) => [saved, ...current])
      setIncidentDescription('')
      setNotice('Incident report saved. An authorised resource manager can review it.')
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The incident report was not saved.')
    } finally {
      setSaving(false)
    }
  }

  if (!canFileReport && reports.length === 0 && !loading) return null

  return (
    <section className="space-y-4" aria-labelledby="booking-reports-title">
      <div>
        <h2 id="booking-reports-title" className="text-lg font-semibold text-neutral-900">
          Handover and condition
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Booking, resource, and permitted window: {booking.resourceTitle} · {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
        </p>
      </div>

      <Alert variant="warning" title="QR handover is not enabled">
        This deployment has no backend credential-issue or one-time consume operation. No QR value is
        shown or accepted here. A scan alone cannot authorise check-in or check-out; contact the
        resource manager to complete handover until the secure backend workflow is available.
      </Alert>

      {errorText && <Alert variant="error" title="Report action failed">{errorText}</Alert>}
      {notice && <Alert variant="success" title="Saved">{notice}</Alert>}

      {canFileReport && !preUseSaved && (
        <Card>
          <form onSubmit={submitCondition} className="space-y-4">
            <h3 className="font-semibold text-neutral-900">Before use · pre-use inspection</h3>
            <Select
              label="Overall condition"
              value={condition.rating}
              onChange={(event) => setCondition({ ...condition, rating: event.target.value as ConditionReportDetails['rating'] })}
              options={[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' },
              ]}
            />
            <Textarea label="Notes" value={condition.notes} onChange={(event) => setCondition({ ...condition, notes: event.target.value })} />
            <Textarea label="Missing accessories" value={condition.missingAccessories} onChange={(event) => setCondition({ ...condition, missingAccessories: event.target.value })} />
            <Textarea label="Visible damage" value={condition.visibleDamage} onChange={(event) => setCondition({ ...condition, visibleDamage: event.target.value })} />
            <Textarea label="Abnormal operating conditions" value={condition.abnormalConditions} onChange={(event) => setCondition({ ...condition, abnormalConditions: event.target.value })} />
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Evidence uploads are unavailable until the private storage bucket and access policy are configured. Do not upload sensitive evidence through a public URL.
            </p>
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input required type="checkbox" checked={condition.confirmed} onChange={(event) => setCondition({ ...condition, confirmed: event.target.checked })} />
              I have inspected the resource and confirm this report is accurate.
            </label>
            <Button type="submit" disabled={saving || !condition.confirmed} isLoading={saving}>Confirm and save pre-use report</Button>
          </form>
        </Card>
      )}

      {canFileReport && preUseSaved && !postUseSaved && (
        <Card>
          <form onSubmit={submitCondition} className="space-y-4">
            <h3 className="font-semibold text-neutral-900">After use · post-use inspection</h3>
            <Select
              label="Overall condition"
              value={condition.rating}
              onChange={(event) => setCondition({ ...condition, rating: event.target.value as ConditionReportDetails['rating'] })}
              options={[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' },
              ]}
            />
            <Textarea label="Notes" value={condition.notes} onChange={(event) => setCondition({ ...condition, notes: event.target.value })} />
            <Textarea label="Missing accessories" value={condition.missingAccessories} onChange={(event) => setCondition({ ...condition, missingAccessories: event.target.value })} />
            <Textarea label="Visible damage" value={condition.visibleDamage} onChange={(event) => setCondition({ ...condition, visibleDamage: event.target.value })} />
            <Textarea label="Abnormal operating conditions" value={condition.abnormalConditions} onChange={(event) => setCondition({ ...condition, abnormalConditions: event.target.value })} />
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input required type="checkbox" checked={condition.confirmed} onChange={(event) => setCondition({ ...condition, confirmed: event.target.checked })} />
              I have inspected the resource and confirm this report is accurate.
            </label>
            <Button type="submit" disabled={saving || !condition.confirmed} isLoading={saving}>Confirm and save post-use report</Button>
          </form>
        </Card>
      )}

      {canFileReport && (
        <Card>
          <form onSubmit={submitIncident} className="space-y-4">
            <h3 className="font-semibold text-neutral-900">Report a resource incident</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Incident category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                options={[
                  { value: 'damage', label: 'Visible damage' },
                  { value: 'missing_equipment', label: 'Missing equipment' },
                  { value: 'safety_concern', label: 'Safety concern' },
                  { value: 'operating_condition', label: 'Abnormal operating condition' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select label="Severity" value={severity} onChange={(event) => setSeverity(event.target.value as ReportSeverity)} options={severityOptions} />
              <div>
                <label htmlFor="incident-date" className="mb-1.5 block text-sm font-medium text-neutral-800">Incident date</label>
                <input id="incident-date" type="date" required value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" />
              </div>
            </div>
            <Textarea label="Description" required value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} />
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Evidence uploads are disabled until private storage access is configured. Incident details are restricted by backend row-level security.
            </p>
            <Button type="submit" disabled={saving} isLoading={saving}>Submit incident report</Button>
          </form>
        </Card>
      )}

      {preUseReport && postUseReport && (
        <Card>
          <h3 className="font-semibold text-neutral-900">Before-and-after comparison</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Inspection</th>
                  <th className="py-2 pr-3 font-medium">Before use</th>
                  <th className="py-2 font-medium">After use</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Overall rating', preUseReport.rating, postUseReport.rating],
                  ['Missing accessories', preUseReport.missingAccessories || 'None reported', postUseReport.missingAccessories || 'None reported'],
                  ['Visible damage', preUseReport.visibleDamage || 'None reported', postUseReport.visibleDamage || 'None reported'],
                  ['Abnormal conditions', preUseReport.abnormalConditions || 'None reported', postUseReport.abnormalConditions || 'None reported'],
                ] as const).map(([label, before, after]) => (
                  <tr key={label} className="border-b border-neutral-100">
                    <th className="py-2 pr-3 font-medium text-neutral-700">{label}</th>
                    <td className="py-2 pr-3 text-neutral-600">{before}</td>
                    <td className={`py-2 ${before !== after ? 'font-semibold text-amber-800' : 'text-neutral-600'}`}>{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-neutral-900">Saved booking reports</h3>
        {loading ? <p className="mt-3 text-sm text-neutral-500">Loading reports…</p> : reports.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No reports have been saved for this booking.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {reports.map((report) => (
              <li key={report.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-neutral-900">{report.title}</p>
                  <span className="text-xs capitalize text-neutral-500">{report.status.replace('_', ' ')}</span>
                </div>
                {report.conditionReport ? (
                  <p className="mt-1 text-sm text-neutral-600">
                    {report.conditionReport.phase === 'pre_use' ? 'Before use' : 'After use'}: {report.conditionReport.rating}.
                    {report.conditionReport.missingAccessories && ` Missing: ${report.conditionReport.missingAccessories}.`}
                    {report.conditionReport.visibleDamage && ` Damage: ${report.conditionReport.visibleDamage}.`}
                  </p>
                ) : <p className="mt-1 text-sm text-neutral-600">{report.description}</p>}
                <p className="mt-1 text-xs text-neutral-500">Saved {formatTime(report.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
