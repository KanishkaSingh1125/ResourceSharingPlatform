import {
  type ConditionOrIncidentReport,
  type ReportCreateInput,
  type ReportType,
} from '@/types/reportIncident'
import { getCurrentProfile } from './authService'
import { getResourceById } from './resourceService'

const STORAGE_KEY_REPORTS = 'sharesphere_reports_incidents_v1'

const SEED_REPORTS: ConditionOrIncidentReport[] = [
  {
    id: 'rep-01',
    type: 'condition_report',
    resourceId: 'res-cryo-tem-01',
    resourceTitle: 'Cryogenic Transmission Electron Microscope (Cryo-TEM 300kV)',
    bookingId: 'book-seed-01',
    reportedByUserId: 'usr-turing-01',
    reportedByUserName: 'Prof. Alan Turing',
    organisationId: 'org-mit-nanotech-01',
    severity: 'low',
    title: 'Routine Nitrogen Top-up & Beam Focus Calibration Completed',
    description: 'De-icing cycle and autoloader cartridge exchange performed. Vacuum verified at 1.2e-8 mbar.',
    status: 'resolved',
    attachments: [],
    resolutionNotes: 'Standard operating procedure logged.',
    createdAt: '2026-10-24T15:00:00Z',
    updatedAt: '2026-10-24T16:00:00Z',
  },
  {
    id: 'rep-02',
    type: 'incident_report',
    resourceId: 'res-anechoic-chamber-08',
    resourceTitle: 'Full Anechoic RF Shielded Test Chamber & Spherical Near-Field Range',
    reportedByUserId: 'usr-turing-01',
    reportedByUserName: 'Prof. Alan Turing',
    organisationId: 'org-stanford-wireless-06',
    severity: 'medium',
    title: 'Elevation Stage Stepper Motor Positional Drift',
    description: 'Positioner reports +0.8 degree optical encoder error during heavy horn antenna rotation.',
    status: 'investigating',
    attachments: [],
    createdAt: '2026-10-26T11:00:00Z',
    updatedAt: '2026-10-26T11:30:00Z',
  },
]

function getStoredReports(): ConditionOrIncidentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(SEED_REPORTS))
      return SEED_REPORTS
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load reports from storage', err)
    return SEED_REPORTS
  }
}

function saveStoredReports(list: ConditionOrIncidentReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save reports to storage', err)
  }
}

export async function getReports(filter: {
  organisationId?: string
  resourceId?: string
  type?: ReportType
} = {}): Promise<ConditionOrIncidentReport[]> {
  const list = getStoredReports()
  let filtered = list

  if (filter.organisationId) {
    filtered = filtered.filter((r) => r.organisationId === filter.organisationId)
  }
  if (filter.resourceId) {
    filtered = filtered.filter((r) => r.resourceId === filter.resourceId)
  }
  if (filter.type) {
    filtered = filtered.filter((r) => r.type === filter.type)
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return filtered
}

export async function createReport(input: ReportCreateInput): Promise<ConditionOrIncidentReport> {
  const user = await getCurrentProfile()
  const resource = await getResourceById(input.resourceId)

  const now = new Date().toISOString()
  const newReport: ConditionOrIncidentReport = {
    id: `rep-${Date.now()}`,
    type: input.type,
    resourceId: input.resourceId,
    resourceTitle: resource ? resource.title : 'Asset',
    bookingId: input.bookingId,
    reportedByUserId: user.id,
    reportedByUserName: user.fullName,
    organisationId: user.organisationId,
    severity: input.severity,
    title: input.title,
    description: input.description,
    status: 'open',
    attachments: input.attachments || [],
    createdAt: now,
    updatedAt: now,
  }

  const list = getStoredReports()
  saveStoredReports([newReport, ...list])
  return newReport
}

export async function resolveReport(
  reportId: string,
  resolutionNotes: string
): Promise<ConditionOrIncidentReport> {
  const list = getStoredReports()
  const report = list.find((r) => r.id === reportId)
  if (!report) {
    throw new Error('Report not found.')
  }

  const updated: ConditionOrIncidentReport = {
    ...report,
    status: 'resolved',
    resolutionNotes,
    updatedAt: new Date().toISOString(),
  }

  saveStoredReports(list.map((r) => (r.id === reportId ? updated : r)))
  return updated
}

