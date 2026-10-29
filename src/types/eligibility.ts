import { type VerificationStatus } from './organisation'

export interface EligibilityCheckResult {
  resourceId: string
  userId: string
  isEligible: boolean
  orgVerified: boolean
  orgVerificationStatus: VerificationStatus
  requiredCredentials: string[]
  userMatchedCredentials: string[]
  missingCredentials: string[]
  hasRequiredRole: boolean
  requiresSupervision: boolean
  blockingReasons: string[]
  advisoryNotes: string[]
}

