import { useState, type SyntheticEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui'
import {
  getCheckinEvents,
  getConditionChecklist,
  getConditionReports,
  issueBookingQrToken,
  submitConditionReport,
  uploadConditionEvidence,
} from '@/features/bookings'
import type {
  Booking,
  CheckinEvent,
  ConditionChecklistItem,
  ConditionRating,
  ConditionReport,
  ReportType,
} from '@/types'

const ratings: ConditionRating[] = ['excellent', 'good', 'fair', 'poor', 'damaged']
const checklistRatings = [...ratings, 'not_applicable'] as const

interface FollowupData {
  checkins: CheckinEvent[]
  reports: ConditionReport[]
  checklist: ConditionChecklistItem[]
}

export function BookingFollowup({ booking }: { booking: Booking }) {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FollowupData>({ checkins: [], reports: [], checklist: [] })
  const [token, setToken] = useState<{ value: string; expiresAt: string } | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)
  const [reportType, setReportType] = useState<ReportType>(booking.status === 'completed' ? 'post_use' : 'pre_use')
  const [condition, setCondition] = useState<ConditionRating>('good')
  const [description, setDescription] = useState('')
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({})
  const [damageFlag, setDamageFlag] = useState(false)
  const [evidence, setEvidence] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const eligible = ['confirmed', 'completed'].includes(booking.status)

  async function load() {
    setLoading(true)
    setError(null)
    const [checkinResult, reportResult, checklistResult] = await Promise.all([
      getCheckinEvents(booking.id),
      getConditionReports(booking.id),
      getConditionChecklist(booking.resource_id),
    ])
    const failures = [checkinResult.error, reportResult.error, checklistResult.error].filter(Boolean)
    if (failures.length) {
      setError(failures.join(' '))
      setLoaded(false)
    } else {
      setLoaded(true)
    }
    setData({
      checkins: checkinResult.data,
      reports: reportResult.data,
      checklist: checklistResult.data,
    })
    setLoading(false)
  }

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const isOpen = event.currentTarget.open
    setExpanded(isOpen)
    if (isOpen && !loaded && !loading) void load()
  }

  async function issueToken(eventType: 'check_in' | 'check_out') {
    setTokenBusy(true)
    setError(null)
    setNotice(null)
    const result = await issueBookingQrToken(booking.id, eventType)
    setTokenBusy(false)
    if (result.error || !result.token) {
      setError(result.error ?? 'Could not issue the QR token.')
      return
    }
    setToken({ value: result.token, expiresAt: result.expires_at ?? '' })
    setNotice(`${eventType === 'check_in' ? 'Check-in' : 'Check-out'} QR issued. It is a one-time token and expires shortly.`)
  }

  async function submitReport(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const requiredItems = data.checklist.filter(item => item.required)
    if (requiredItems.some(item => !checklistValues[item.item_key])) {
      setError('Complete every required condition checklist item before submitting.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await submitConditionReport({
      booking_id: booking.id,
      resource_id: booking.resource_id,
      report_type: reportType,
      condition,
      description: description.trim(),
      checklist: checklistValues,
      damage_flag: damageFlag,
    })
    if (result.error || !result.data) {
      setSaving(false)
      setError(result.error ?? 'Could not submit the condition report.')
      return
    }
    let message = `${reportType === 'pre_use' ? 'Pre-use' : 'Post-use'} condition report submitted.`
    if (result.incident_id) message += ' A discrepancy incident was recorded for manager review.'
    if (evidence) {
      const evidenceResult = await uploadConditionEvidence(result.data.id, booking.id, evidence)
      if (evidenceResult.error) setError(`The report was saved, but evidence upload failed: ${evidenceResult.error}`)
      else message += ' Evidence uploaded.'
    }
    setNotice(message)
    setDescription('')
    setEvidence(null)
    setDamageFlag(false)
    setSaving(false)
    await load()
  }

  if (!eligible) return null

  return (
    <details className="mt-4 border-t border-neutral-100 pt-3" onToggle={onToggle}>
      <summary className="cursor-pointer text-sm font-medium text-brand-700">Check-in and condition records</summary>
      {expanded && (
        <div className="mt-3 space-y-4">
          {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-md bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
          <section aria-busy={loading}>
            <h4 className="text-sm font-semibold text-neutral-800">One-time check-in/out QR</h4>
            <p className="mt-1 text-xs text-neutral-600">The QR contains only a short-lived bearer token. Present it to authorised resource staff; do not share it publicly.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={tokenBusy} onClick={() => void issueToken('check_in')}>Issue check-in QR</Button>
              <Button type="button" size="sm" variant="outline" disabled={tokenBusy} onClick={() => void issueToken('check_out')}>Issue check-out QR</Button>
              {token && <Button type="button" size="sm" variant="ghost" onClick={() => setToken(null)}>Hide QR</Button>}
            </div>
            {token && (
              <div className="mt-3 inline-flex flex-col items-center gap-2 rounded-md border border-neutral-200 bg-white p-3">
                <QRCodeSVG value={token.value} size={176} level="M" title="Single-use booking check-in token" />
                <p className="text-xs text-neutral-600">{token.expiresAt ? `Expires ${formatDate(token.expiresAt)}` : 'Short-lived token'}</p>
              </div>
            )}
            {data.checkins.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                {data.checkins.map(item => <li key={item.id}>{item.event_type.replace('_', ' ')} · {formatDate(item.recorded_at)}</li>)}
              </ul>
            )}
          </section>

          <section className="border-t border-neutral-100 pt-3">
            <h4 className="text-sm font-semibold text-neutral-800">Condition reports</h4>
            {data.reports.map(report => (
              <p key={report.id} className="mt-1 text-xs text-neutral-600">
                {report.report_type.replace('_', ' ')} · {report.condition} · {formatDate(report.reported_at)}
                {report.damage_flag ? ' · damage reported' : ''}
              </p>
            ))}
            <form onSubmit={event => void submitReport(event)} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-neutral-700">
                  Report type
                  <select value={reportType} onChange={event => setReportType(event.target.value as ReportType)}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2">
                    <option value="pre_use">Pre-use</option>
                    <option value="post_use">Post-use</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-neutral-700">
                  Overall condition
                  <select value={condition} onChange={event => setCondition(event.target.value as ConditionRating)}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2">
                    {ratings.map(rating => <option key={rating} value={rating}>{rating}</option>)}
                  </select>
                </label>
              </div>
              {data.checklist.map(item => (
                <label key={item.id} className="block text-xs font-medium text-neutral-700">
                  {item.label}{item.required ? ' (required)' : ''}
                  <select value={checklistValues[item.item_key] ?? ''}
                    onChange={event => setChecklistValues(current => ({ ...current, [item.item_key]: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2">
                    <option value="">Not assessed</option>
                    {checklistRatings.map(rating => <option key={rating} value={rating}>{rating.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
              ))}
              <label className="block text-xs font-medium text-neutral-700">
                Notes
                <textarea maxLength={2000} rows={2} value={description} onChange={event => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-2" />
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-700">
                <input type="checkbox" checked={damageFlag} onChange={event => setDamageFlag(event.target.checked)} />
                Report damage
              </label>
              <label className="block text-xs font-medium text-neutral-700">
                Optional photo evidence (JPEG, PNG, or WebP; up to 10 MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setEvidence(event.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs" />
              </label>
              <Button type="submit" size="sm" disabled={saving || loading}>{saving ? 'Submitting…' : 'Submit condition report'}</Button>
            </form>
          </section>
        </div>
      )}
    </details>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
