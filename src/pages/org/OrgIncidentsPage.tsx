import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Textarea } from '@/components/ui'
import { getCurrentProfile } from '@/services/authService'
import { getReports, resolveReport } from '@/services/reportIncidentService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { type ConditionOrIncidentReport } from '@/types/reportIncident'

interface ResourceRestriction {
  id: string
  title: string
  availability_status: string
}

function isLocked(status: string) {
  return status === 'unavailable' || status === 'maintenance'
}

export function OrgIncidentsPage() {
  const [reports, setReports] = useState<ConditionOrIncidentReport[]>([])
  const [restrictions, setRestrictions] = useState<ResourceRestriction[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [authorised, setAuthorised] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (!isSupabaseConfigured) throw new Error('Incident review requires a configured Supabase backend.')
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw new Error(`Could not verify your session: ${authError.message}`)
        if (!auth.user) throw new Error('Sign in with an authorised resource-manager account.')
        const profile = await getCurrentProfile()
        if (profile.id !== auth.user.id || !['manager', 'org_admin', 'platform_admin'].includes(profile.role)) {
          throw new Error('Incident review is restricted to authorised resource managers.')
        }
        if (!active) return
        setAuthorised(true)
        const [items, resourcesResult] = await Promise.all([
          getReports({ type: 'incident_report' }),
          supabase
            .from('resources')
            .select('id,title,availability_status')
            .eq('organisation_id', profile.organisationId),
        ])
        if (!active) return
        setReports(items)
        if (resourcesResult.error) {
          setResourceError(`Resource restriction status could not be loaded: ${resourcesResult.error.message}`)
        } else {
          setRestrictions((resourcesResult.data || []) as ResourceRestriction[])
        }
      } catch (error) {
        if (active) setErrorText(error instanceof Error ? error.message : 'Incident reports could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const handleResolve = async (report: ConditionOrIncidentReport) => {
    setSavingId(report.id)
    setErrorText(null)
    setNotice(null)
    try {
      const updated = await resolveReport(report.id, notes[report.id] || '')
      setReports((items) => items.map((item) => item.id === updated.id ? updated : item))
      setNotice(`Incident "${report.title}" was marked resolved.`)
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'The review action was not saved.')
    } finally {
      setSavingId(null)
    }
  }

  const activeCount = reports.filter((report) => report.status !== 'resolved').length
  const lockedResources = restrictions.filter((resource) => isLocked(resource.availability_status))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Reports"
        subtitle="Review damage, missing equipment, safety concerns, and operating incidents."
        badge={<Badge variant={activeCount ? 'error' : 'default'}>{activeCount} Active</Badge>}
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Incident Reports' },
        ]}
      />

      {lockedResources.length > 0 && (
        <Alert variant="error" title="Resource restrictions — do not use">
          <ul className="list-disc space-y-1 pl-5">
            {lockedResources.map((resource) => (
              <li key={resource.id}>
                <strong>{resource.title}</strong> is marked {resource.availability_status.replace('_', ' ')} by the backend.
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {resourceError && <Alert variant="error" title="Restriction status unavailable">{resourceError}</Alert>}
      {errorText && <Alert variant="error" title="Incident review unavailable">{errorText}</Alert>}
      {notice && <Alert variant="success" title="Review saved">{notice}</Alert>}

      {loading ? (
        <Card><p className="text-sm text-neutral-500">Loading incidents and resource restrictions…</p></Card>
      ) : authorised && reports.length === 0 && !errorText ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6 text-neutral-400" />}
          title="No incident reports"
          description="Reports submitted by authorised booking participants will appear here."
          compact
        />
      ) : authorised ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold capitalize text-neutral-900">{report.category?.replaceAll('_', ' ') || report.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{report.resourceTitle} · {report.incidentDate || new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={report.status === 'resolved' ? 'success' : report.severity === 'critical' || report.severity === 'high' ? 'error' : 'warning'}>
                  {report.status} · {report.severity}
                </Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{report.description}</p>
              {report.bookingId && <p className="mt-2 text-xs text-neutral-500">Related booking: {report.bookingId}</p>}
              {report.resolutionNotes && (
                <div className="mt-3 border-l-4 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Resolution: {report.resolutionNotes}
                </div>
              )}
              {report.status === 'open' && (
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                  <Textarea
                    label="Review / resolution notes"
                    value={notes[report.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    helperText="Record actions taken and any safety follow-up before resolving."
                  />
                  <Button onClick={() => void handleResolve(report)} disabled={savingId === report.id} isLoading={savingId === report.id}>
                    Record resolution
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
