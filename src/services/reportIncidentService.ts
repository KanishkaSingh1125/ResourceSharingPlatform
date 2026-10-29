import { getCurrentProfile } from './authService'
import { getResourceById } from './resourceService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { type Database } from '@/types/database'
import {
  type ConditionOrIncidentReport,
  type ConditionReportDetails,
  type ReportCreateInput,
  type ReportSeverity,
  type ReportStatus,
  type ReportType,
} from '@/types/reportIncident'

type ReportRow = Database['public']['Tables']['reports_and_incidents']['Row']

const REPORT_DETAILS_MARKER = 'sharesphere-report-v1:'
const severities: ReportSeverity[] = ['low', 'medium', 'high', 'critical']
const statuses: ReportStatus[] = ['open', 'investigating', 'resolved']

async function requireCurrentUser() {
  if (!isSupabaseConfigured) {
    throw new Error('Reports require a configured Supabase backend.')
  }
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Could not verify your session: ${error.message}`)
  if (!data.user) throw new Error('Sign in before accessing reports.')
  const profile = await getCurrentProfile()
  if (profile.id !== data.user.id) {
    throw new Error('Your authenticated profile could not be verified.')
  }
  return profile
}

function decodeDetails(value: string) {
  if (!value.startsWith(REPORT_DETAILS_MARKER)) {
    return { description: value } as const
  }
  try {
    const parsed: unknown = JSON.parse(value.slice(REPORT_DETAILS_MARKER.length))
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('The saved report details are invalid.')
    }
    const details = parsed as Record<string, unknown>
    return {
      description: typeof details.description === 'string' ? details.description : '',
      category: typeof details.category === 'string' ? details.category : undefined,
      incidentDate: typeof details.incidentDate === 'string' ? details.incidentDate : undefined,
      conditionReport: isConditionReport(details.conditionReport)
        ? details.conditionReport
        : undefined,
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('A saved report contains unreadable details.')
    }
    throw error
  }
}

function isConditionReport(value: unknown): value is ConditionReportDetails {
  if (!value || typeof value !== 'object') return false
  const details = value as Record<string, unknown>
  return (
    (details.phase === 'pre_use' || details.phase === 'post_use') &&
    ['excellent', 'good', 'fair', 'poor'].includes(String(details.rating)) &&
    typeof details.notes === 'string' &&
    typeof details.missingAccessories === 'string' &&
    typeof details.visibleDamage === 'string' &&
    typeof details.abnormalConditions === 'string' &&
    details.confirmed === true
  )
}

async function toReport(row: ReportRow): Promise<ConditionOrIncidentReport> {
  if (
    !severities.includes(row.severity as ReportSeverity) ||
    !statuses.includes(row.status as ReportStatus) ||
    (row.type !== 'condition_report' && row.type !== 'incident_report')
  ) {
    throw new Error('The report service returned an unsupported record.')
  }
  const [resource, profile] = await Promise.all([
    getResourceById(row.resource_id),
    getCurrentProfile(),
  ])
  const details = decodeDetails(row.description)
  return {
    id: row.id,
    type: row.type,
    resourceId: row.resource_id,
    resourceTitle: resource?.title || 'Resource',
    bookingId: row.booking_id || undefined,
    reportedByUserId: row.reported_by_user_id,
    reportedByUserName:
      row.reported_by_user_id === profile.id ? profile.fullName : 'Authorised user',
    organisationId: row.organisation_id,
    severity: row.severity as ReportSeverity,
    title: row.title,
    description: details.description,
    status: row.status as ReportStatus,
    attachments: Array.isArray(row.attachments)
      ? row.attachments.filter((item): item is string => typeof item === 'string')
      : [],
    resolutionNotes: row.resolution_notes || undefined,
    category: details.category,
    incidentDate: details.incidentDate,
    conditionReport: details.conditionReport,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function encodeDetails(input: ReportCreateInput): string {
  return `${REPORT_DETAILS_MARKER}${JSON.stringify({
    description: input.description.trim(),
    category: input.category,
    incidentDate: input.incidentDate,
    conditionReport: input.conditionReport,
  })}`
}

export async function getReports(filter: {
  organisationId?: string
  resourceId?: string
  bookingId?: string
  type?: ReportType
} = {}): Promise<ConditionOrIncidentReport[]> {
  await requireCurrentUser()
  let query = supabase
    .from('reports_and_incidents')
    .select('*')
    .order('created_at', { ascending: false })
  if (filter.organisationId) query = query.eq('organisation_id', filter.organisationId)
  if (filter.resourceId) query = query.eq('resource_id', filter.resourceId)
  if (filter.bookingId) query = query.eq('booking_id', filter.bookingId)
  if (filter.type) query = query.eq('type', filter.type)

  const { data, error } = await query
  if (error) throw new Error(`Could not load reports: ${error.message}`)
  return Promise.all((data || []).map((row: ReportRow) => toReport(row)))
}

export async function createReport(input: ReportCreateInput): Promise<ConditionOrIncidentReport> {
  const user = await requireCurrentUser()
  if (!input.title.trim() || !input.description.trim()) {
    throw new Error('Provide a title and description before submitting the report.')
  }
  if (input.attachments?.length) {
    throw new Error('Evidence uploads are unavailable until private storage is configured.')
  }
  if (input.type === 'condition_report' && !isConditionReport(input.conditionReport)) {
    throw new Error('Complete and confirm the condition report before submitting it.')
  }
  if (input.type === 'condition_report' && !input.bookingId) {
    throw new Error('Condition inspections must be linked to a confirmed booking.')
  }
  if (input.type === 'incident_report' && (!input.category || !input.incidentDate)) {
    throw new Error('Choose an incident category and date before submitting the report.')
  }

  if (input.bookingId) {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('resource_id,user_id,owner_organisation_id,status')
      .eq('id', input.bookingId)
      .maybeSingle()
    if (bookingError) throw new Error(`Could not verify the related booking: ${bookingError.message}`)
    if (!booking || booking.resource_id !== input.resourceId) {
      throw new Error('The selected booking does not match this resource or is not visible to you.')
    }
    const isParticipant = booking.user_id === user.id
    const isResourceManager =
      booking.owner_organisation_id === user.organisationId &&
      ['manager', 'org_admin', 'platform_admin'].includes(user.role)
    if (!isParticipant && !isResourceManager) {
      throw new Error('Only a booking participant or authorised resource manager can submit this report.')
    }
    if (input.type === 'condition_report' && !['approved', 'confirmed', 'in_progress', 'completed'].includes(booking.status)) {
      throw new Error('Condition reports can only be filed for an approved booking.')
    }
  }

  const resource = await getResourceById(input.resourceId)
  if (!resource) throw new Error('The selected resource could not be verified.')
  const { data, error } = await supabase
    .from('reports_and_incidents')
    .insert({
      type: input.type,
      resource_id: input.resourceId,
      booking_id: input.bookingId || null,
      reported_by_user_id: user.id,
      organisation_id: user.organisationId,
      severity: input.severity,
      title: input.title.trim(),
      description: encodeDetails(input),
      status: 'open',
      attachments: [],
    })
    .select('*')
    .single()
  if (error) throw new Error(`Could not save the report: ${error.message}`)
  if (!data) throw new Error('The backend did not confirm report persistence.')
  return toReport(data as ReportRow)
}

export async function resolveReport(
  reportId: string,
  resolutionNotes: string
): Promise<ConditionOrIncidentReport> {
  const profile = await requireCurrentUser()
  if (!['manager', 'org_admin', 'platform_admin'].includes(profile.role)) {
    throw new Error('Only an authorised resource manager can review a report.')
  }
  if (!resolutionNotes.trim()) {
    throw new Error('Add resolution notes before closing this report.')
  }
  const { data, error } = await supabase
    .from('reports_and_incidents')
    .update({
      status: 'resolved',
      resolution_notes: resolutionNotes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'open')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`Could not resolve the report: ${error.message}`)
  if (!data) throw new Error('This report is no longer open or you cannot manage it.')
  return toReport(data as ReportRow)
}
