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
  category?: string
  incidentDate?: string
  conditionReport?: ConditionReportDetails
  createdAt: string
  updatedAt: string
}

export interface ConditionReportDetails {
  phase: 'pre_use' | 'post_use'
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  notes: string
  missingAccessories: string
  visibleDamage: string
  abnormalConditions: string
  confirmed: boolean
}

export interface ReportCreateInput {
  type: ReportType
  resourceId: string
  bookingId?: string
  severity: ReportSeverity
  title: string
  description: string
  attachments?: string[]
  category?: string
  incidentDate?: string
  conditionReport?: ConditionReportDetails
}
