import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui'
import { getOrgSharingAnalytics } from '@/features/organisations'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { OrgSharingAnalytics } from '@/types'

export function OrgAnalyticsPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [fromDate, setFromDate] = useState(() => daysAgo(29))
  const [toDate, setToDate] = useState(() => today())
  const [data, setData] = useState<OrgSharingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setLoading(false)
      setData(null)
      return
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      setLoading(false)
      setData(null)
      setError('Choose a valid date range.')
      return
    }
    const start = new Date(`${fromDate}T00:00:00.000Z`)
    const end = new Date(`${toDate}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 1)
    if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
      setLoading(false)
      setData(null)
      setError('The reporting period cannot exceed 366 days.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await getOrgSharingAnalytics(
      activeOrganisation.id,
      start.toISOString(),
      end.toISOString(),
    )
    setData(result.data)
    setError(result.error)
    setLoading(false)
  }, [activeOrganisation, fromDate, toDate])

  useEffect(() => { void load() }, [load])

  const chartData = useMemo(() => data ? [
    { name: 'Available', minutes: data.available_minutes },
    { name: 'Booked', minutes: data.booked_minutes },
    ...(data.verified_usage_booking_count > 0
      ? [{ name: 'Measured use', minutes: data.actual_usage_minutes }]
      : []),
  ] : [], [data])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to view analytics.'}</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Share impact analytics</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Authorised, organisation-scoped measurements for {activeOrganisation.name}. No estimated savings are shown.
      </p>
      <Card className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-neutral-700">
            From
            <input type="date" value={fromDate} max={toDate || undefined}
              onChange={event => setFromDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            To
            <input type="date" value={toDate} min={fromDate || undefined}
              onChange={event => setToDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
          </label>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Utilisation = booked or measured-use minutes divided by scheduled available minutes. Completed measured use requires recorded check-in and check-out. Cancelled bookings are excluded from booked utilisation.
        </p>
      </Card>

      <div className="mt-5" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading authorised analytics…</Card>
        ) : error ? (
          <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-800">
            <p className="font-semibold">Analytics unavailable</p><p className="mt-1 break-words">{error}</p>
          </Card>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Resources" value={`${data.published_resource_count} published / ${data.resource_count} total`} />
              <Metric label="Bookings in period" value={data.booking_count} detail={`${data.cancelled_booking_count} cancelled separately`} />
              <Metric label="Completed with verified usage" value={data.verified_usage_booking_count} />
              <Metric label="Completed bookings" value={data.completed_booking_count} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="font-semibold text-neutral-900">Utilisation minutes</h2>
                <p className="mt-1 text-xs text-neutral-500">Values are aggregated by the backend for the selected period.</p>
                <div className="mt-4 h-72" role="img" aria-label={`Bar chart comparing ${chartData.map(item => item.name.toLowerCase()).join(', ')} minutes`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit=" min" />
                      <Tooltip formatter={value => [`${Number(value).toLocaleString()} minutes`, 'Duration']} />
                      <Bar dataKey="minutes" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  {chartData.map(item => (
                    <div key={item.name}>
                      <dt className="text-xs text-neutral-500">{item.name}</dt>
                      <dd className="font-semibold text-neutral-900">
                        {item.name === 'Measured use' && data.verified_usage_booking_count === 0
                          ? 'Unavailable'
                          : `${item.minutes.toLocaleString()} min`}
                      </dd>
                    </div>
                  ))}
                </dl>
                {data.verified_usage_booking_count === 0 && (
                  <p className="mt-3 text-sm text-neutral-600">Measured use: unavailable (no verified check-in/out samples).</p>
                )}
              </Card>
              <Card>
                <h2 className="font-semibold text-neutral-900">Utilisation rates</h2>
                <dl className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-neutral-600">Booked utilisation</dt>
                    <dd className="font-semibold text-neutral-900">{formatPercent(data.booked_utilization)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-neutral-600">Measured usage utilisation</dt>
                    <dd className="font-semibold text-neutral-900">
                      {data.verified_usage_booking_count > 0 ? formatPercent(data.actual_utilization) : 'Unavailable'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-5 text-xs text-neutral-500">
                  A rate is unavailable when no schedule minutes were recorded. It is not treated as zero.                   {data.verified_usage_booking_count === 0
                    ? 'Measured use is unavailable because no completed booking has a valid check-in/out pair in this period.'
                    : data.usage_is_measured
                      ? 'Measured use is based on recorded check-in/out events.'
                      : 'Measured-use status is unavailable.'}
                </p>
                <p className="mt-3 text-xs text-neutral-500">
                  {data.cancelled_booking_count} cancelled {data.cancelled_booking_count === 1 ? 'booking is' : 'bookings are'} excluded from the booking utilisation numerator.
                </p>
              </Card>
            </div>
          </>
        ) : (
          <Card className="text-sm text-neutral-600">No analytics are available for this period.</Card>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-neutral-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-neutral-500">{detail}</p>}
    </Card>
  )
}

function formatPercent(value: number | null) {
  return value === null || !Number.isFinite(value) ? 'Unavailable' : `${(value * 100).toFixed(1)}%`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}
