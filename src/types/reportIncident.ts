export type ReportType = 'condition_report' | 'incident_report'
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ReportStatus = 'open' | 'investigating' | 'resolved'

export interface ConditionOrIncidentReport {
  id: string
  type: ReportType
  resourceId: string
  resourceTitle: string
  bookingId?: string
  reportedByUserId: string
  reportedByUserName: string
  organisationId: string
  severity: ReportSeverity
  title: string
  description: string
  status: ReportStatus
  attachments: string[]
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface ReportCreateInput {
  type: ReportType
  resourceId: string
  bookingId?: string
  severity: ReportSeverity
  title: string
  description: string
  attachments?: string[]
}

