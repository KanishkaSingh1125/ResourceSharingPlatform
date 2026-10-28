import { type EligibilityCheckResult } from '@/types/eligibility'
import { getResourceById } from './resourceService'
import { getCurrentProfile } from './authService'
import { getOrganisationById } from './organisationService'

export async function checkUserResourceEligibility(
  userId: string,
  resourceId: string
): Promise<EligibilityCheckResult> {
  const resource = await getResourceById(resourceId)
  if (!resource) {
    throw new Error(`Resource "${resourceId}" not found.`)
  }

  const profile = await getCurrentProfile()
  const userOrg = await getOrganisationById(profile.organisationId)

  const orgVerified = userOrg ? userOrg.verificationStatus === 'approved' : false
  const orgStatus = userOrg ? userOrg.verificationStatus : 'draft'

  const userCredNames = new Set(
    profile.credentials
      .filter((c) => c.verificationStatus === 'verified')
      .map((c) => c.name.toLowerCase().trim())
  )

  const required = resource.requiredCredentials || []
  const matched: string[] = []
  const missing: string[] = []

  for (const req of required) {
    const reqLower = req.toLowerCase().trim()
    // Exact or substring match on verified user credentials
    const isMatched = Array.from(userCredNames).some(
      (c) => c.includes(reqLower) || reqLower.includes(c)
    )
    if (isMatched) {
      matched.push(req)
    } else {
      missing.push(req)
    }
  }

  const blockingReasons: string[] = []
  const advisoryNotes: string[] = []

  // Rule 1: Organisation Verification Check
  if (!orgVerified) {
    blockingReasons.push(
      `Your home organisation (${profile.organisationName}) is in "${orgStatus.replace(/_/g, ' ')}" status. Full cross-institutional sharing requires an approved institutional verification.`
    )
  }

  // Rule 2: Access Level Check
  const isOwnOrg = profile.organisationId === resource.organisationId
  let hasRequiredRole = true

  if (resource.accessLevel === 'members_only' && !isOwnOrg) {
    hasRequiredRole = false
    blockingReasons.push(
      'This resource is designated for internal members of the host organisation only.'
    )
  }

  // Rule 3: Credentials Check
  if (missing.length > 0) {
    blockingReasons.push(
      `Missing required laboratory safety credentials: ${missing.join(', ')}.`
    )
  }

  // Advisories
  if (resource.accessLevel === 'approval_required') {
    advisoryNotes.push(
      'Reservation requires review and approval by the facility resource manager.'
    )
  }

  if (resource.bookingConditions && resource.bookingConditions.length > 0) {
    advisoryNotes.push(...resource.bookingConditions)
  }

  const isEligible = blockingReasons.length === 0

  return {
    resourceId,
    userId,
    isEligible,
    orgVerified,
    orgVerificationStatus: orgStatus,
    requiredCredentials: required,
    userMatchedCredentials: matched,
    missingCredentials: missing,
    hasRequiredRole,
    requiresSupervision: missing.length > 0 && isEligible === false,
    blockingReasons,
    advisoryNotes,
  }
}

