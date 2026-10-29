/**
 * features/eligibility/eligibilityService.ts
 *
 * Server-side eligibility checks and FairShare allocation scoring.
 *
 * Eligibility is split into:
 *   1. Hard blocks (safety) — cannot be overridden
 *   2. Soft factors (fairness) — used for FairShare scoring
 *
 * FairShare scoring is deterministic and explainable.
 * Factors: wait_time, prior_usage, need_urgency, owner_priority, equal_access.
 * The policy version and explanation are recorded with every booking.
 */

import { supabase } from '@/lib/supabase'
import type {
  EligibilityCheckResult,
  EligibilityReason,
  EligibilityRule,
  FairSharePolicy,
  FairShareScore,
  CredentialVerificationHistory,
  CredentialVerificationSource,
  CredentialShareAttribute,
  CredentialShareConsent,
  RecipientCredentialShareConsent,
  CredentialShareConsentHistory,
  ConsentedCredential,
  RpcResult,
  UserCredential,
} from '@/types'

// ── Eligibility Check ────────────────────────────────────────────────────────

/**
 * Evaluate all eligibility rules for a user attempting to book a resource.
 * Returns structured pass/fail with reason codes and next actions.
 */
export async function checkEligibility(
  userId: string,
  resourceId: string,
  _orgId?: string
): Promise<EligibilityCheckResult> {
  const reasons: EligibilityReason[] = []
  let nextAction: string | null = null

  // 1. Load rules for this resource
  const { data: rules } = await supabase
    .from('eligibility_rules')
    .select('*')
    .eq('resource_id', resourceId)

  const eligibilityRules = (rules ?? []) as EligibilityRule[]

  // 2. Load resource + org info
  const { data: resource } = await supabase
    .from('resources')
    .select('*, organisations(verification_status)')
    .eq('id', resourceId)
    .single()

  if (!resource) {
    return {
      eligible: false,
      reasons: [{ rule_type: 'org_verification', passed: false, code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found', is_hard_block: true }],
      next_action: null,
    }
  }

  // 3. Check organisation verification
  const orgVerification = (resource.organisations as Record<string, unknown>)?.verification_status
  if (orgVerification !== 'approved') {
    reasons.push({
      rule_type: 'org_verification',
      passed: false,
      code: 'ORG_NOT_VERIFIED',
      message: 'The owning organisation is not verified',
      is_hard_block: true,
    })
  } else {
    reasons.push({
      rule_type: 'org_verification',
      passed: true,
      code: 'ORG_VERIFIED',
      message: 'Organisation is verified',
      is_hard_block: false,
    })
  }

  // 4. Check publication status
  if (resource.publication_status !== 'published') {
    reasons.push({
      rule_type: 'org_restriction',
      passed: false,
      code: 'NOT_PUBLISHED',
      message: 'Resource is not currently published',
      is_hard_block: true,
    })
  }

  // 5. Check user org membership
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)

  const userOrgs = (memberships ?? []).map((m: Record<string, unknown>) => m.org_id as string)
  const hasAnyMembership = userOrgs.length > 0

  if (!hasAnyMembership) {
    reasons.push({
      rule_type: 'org_membership',
      passed: false,
      code: 'NO_ORG_MEMBERSHIP',
      message: 'You must belong to an organisation to book resources',
      is_hard_block: true,
    })
    nextAction = 'Join an organisation'
  } else {
    reasons.push({
      rule_type: 'org_membership',
      passed: true,
      code: 'HAS_ORG_MEMBERSHIP',
      message: 'Organisation membership confirmed',
      is_hard_block: false,
    })
  }

  // 6. Evaluate each rule
  for (const rule of eligibilityRules) {
    const result = await evaluateRule(rule, userId, userOrgs)
    reasons.push(result)
    if (!result.passed && result.is_hard_block && !nextAction) {
      nextAction = getNextActionForRule(rule)
    }
  }

  // 7. Check maintenance blocks (time-independent general check)
  // Specific time-range checks happen in create_booking()

  const hardFails = reasons.filter(r => !r.passed && r.is_hard_block)
  const eligible = hardFails.length === 0

  return { eligible, reasons, next_action: eligible ? null : nextAction }
}

async function evaluateRule(
  rule: EligibilityRule,
  userId: string,
  userOrgs: string[]
): Promise<EligibilityReason> {
  const config = rule.rule_config as Record<string, unknown>

  switch (rule.rule_type) {
    case 'credential': {
      const requiredType = config.credential_type as string
      const { data: creds } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('credential_type', requiredType)
        .eq('verified', true)

      const hasCred = (creds ?? []).length > 0
      return {
        rule_type: 'credential',
        passed: hasCred,
        code: hasCred ? 'CREDENTIAL_OK' : 'CREDENTIAL_MISSING',
        message: hasCred
          ? `Required credential "${requiredType}" verified`
          : `Missing required credential: ${requiredType}`,
        is_hard_block: rule.is_hard_block,
      }
    }

    case 'training': {
      const trainingType = config.training_type as string
      const { data: creds } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('credential_type', trainingType)
        .eq('verified', true)

      const hasTrain = (creds ?? []).length > 0
      return {
        rule_type: 'training',
        passed: hasTrain,
        code: hasTrain ? 'TRAINING_OK' : 'TRAINING_MISSING',
        message: hasTrain
          ? `Required training "${trainingType}" completed`
          : `Training required: ${trainingType}`,
        is_hard_block: rule.is_hard_block,
      }
    }

    case 'org_restriction': {
      const allowedOrgs = (config.allowed_org_ids ?? []) as string[]
      if (allowedOrgs.length === 0) {
        return { rule_type: 'org_restriction', passed: true, code: 'NO_ORG_RESTRICTION',
          message: 'No organisation restrictions', is_hard_block: false }
      }
      const hasAccess = userOrgs.some(id => allowedOrgs.includes(id))
      return {
        rule_type: 'org_restriction',
        passed: hasAccess,
        code: hasAccess ? 'ORG_ALLOWED' : 'ORG_RESTRICTED',
        message: hasAccess
          ? 'Your organisation has access'
          : 'Resource is restricted to specific organisations',
        is_hard_block: rule.is_hard_block,
      }
    }

    case 'approval_required':
      return {
        rule_type: 'approval_required',
        passed: true,  // This doesn't block — it just means booking needs approval
        code: 'APPROVAL_REQUIRED',
        message: 'Booking requires approval from the resource owner',
        is_hard_block: false,
      }

    default:
      return {
        rule_type: rule.rule_type,
        passed: true,
        code: 'RULE_SKIPPED',
        message: `Rule type "${rule.rule_type}" evaluated as pass`,
        is_hard_block: false,
      }
  }
}

function getNextActionForRule(rule: EligibilityRule): string {
  switch (rule.rule_type) {
    case 'credential': return 'Upload the required credential'
    case 'training': return 'Complete the required training'
    case 'org_restriction': return 'Contact the resource owner for access'
    case 'org_membership': return 'Join an organisation'
    default: return 'Contact the resource owner'
  }
}

// ── Eligibility Rule Management ──────────────────────────────────────────────

export async function getEligibilityRules(resourceId: string) {
  const { data, error } = await supabase
    .from('eligibility_rules')
    .select('*')
    .eq('resource_id', resourceId)
    .order('created_at')

  return { data: (data ?? []) as EligibilityRule[], error: error?.message ?? null }
}

export async function addEligibilityRule(rule: Omit<EligibilityRule, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('eligibility_rules')
    .insert(rule)
    .select()
    .single()

  return { data: data as EligibilityRule | null, error: error?.message ?? null }
}

export async function deleteEligibilityRule(ruleId: string) {
  const { error } = await supabase
    .from('eligibility_rules')
    .delete()
    .eq('id', ruleId)

  return { error: error?.message ?? null }
}

// ── User Credentials ─────────────────────────────────────────────────────────

export async function getMyCredentials() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_credentials')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { data: (data ?? []) as UserCredential[], error: error?.message ?? null }
}

export async function addCredential(input: {
  credential_type: string
  credential_name: string
  issued_at?: string
  expires_at?: string
  document_url?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_credentials')
    .insert({ ...input, user_id: user.id })
    .select()
    .single()

  return { data: data as UserCredential | null, error: error?.message ?? null }
}

export async function reviewCredential(input: {
  credential_id: string
  verified: boolean
  verification_source?: CredentialVerificationSource
  reason: string
}) {
  if (input.verified && !input.verification_source) {
    return { success: false, error: 'Choose a verification source before verifying this credential.' } as RpcResult
  }
  const { data, error } = await supabase.rpc('review_user_credential', {
    _credential_id: input.credential_id,
    _verified: input.verified,
    _verification_source: input.verified ? input.verification_source ?? null : null,
    _reason: input.reason,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function getCredentialVerificationHistory(credentialId: string) {
  const { data, error } = await supabase
    .from('credential_verification_history')
    .select('*')
    .eq('credential_id', credentialId)
    .order('changed_at', { ascending: false })
  return { data: (data ?? []) as CredentialVerificationHistory[], error: error?.message ?? null }
}

export async function getMyCredentialShareConsents() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }
  const { data, error } = await supabase
    .from('credential_share_consents')
    .select('*')
    .eq('subject_user_id', user.id)
    .order('granted_at', { ascending: false })
  return { data: (data ?? []) as CredentialShareConsent[], error: error?.message ?? null }
}

export async function getCredentialShareConsentsForOrganisation(orgId: string) {
  const { data, error } = await supabase
    .from('credential_share_consents')
    .select('id, recipient_org_id, purpose, allowed_attributes, granted_at, expires_at, revoked_at')
    .eq('recipient_org_id', orgId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('granted_at', { ascending: false })
  return {
    data: (data ?? []) as RecipientCredentialShareConsent[],
    error: error?.message ?? null,
  }
}

export async function getCredentialShareConsentHistory(consentId: string) {
  const { data, error } = await supabase
    .from('credential_share_consent_history')
    .select('*')
    .eq('consent_id', consentId)
    .order('occurred_at', { ascending: false })
  return { data: (data ?? []) as CredentialShareConsentHistory[], error: error?.message ?? null }
}

export async function grantCredentialShareConsent(input: {
  recipient_org_id: string
  purpose: string
  allowed_attributes: CredentialShareAttribute[]
  expires_at: string
}) {
  const { data, error } = await supabase.rpc('grant_credential_share_consent', {
    _recipient_org_id: input.recipient_org_id,
    _purpose: input.purpose,
    _allowed_attributes: input.allowed_attributes,
    _expires_at: input.expires_at,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function revokeCredentialShareConsent(consentId: string, reason: string) {
  const { data, error } = await supabase.rpc('revoke_credential_share_consent', {
    _consent_id: consentId,
    _reason: reason,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function getConsentedCredentials(consentId: string, purpose: string) {
  const { data, error } = await supabase.rpc('get_consented_credentials', {
    _consent_id: consentId,
    _purpose: purpose,
  })
  return { data: (data ?? []) as ConsentedCredential[], error: error?.message ?? null }
}

// ── FairShare Scoring ────────────────────────────────────────────────────────

/**
 * Compute a deterministic FairShare score for a booking request.
 * Higher score = higher priority in allocation.
 *
 * Factors:
 *   - wait_time: how long the user/org has been waiting (queue time)
 *   - prior_usage: inverse of recent booking count (less usage = higher score)
 *   - need_urgency: time-sensitive operational need indicator
 *   - owner_priority: owner organisation gets a small boost
 *   - equal_access: ensures all eligible orgs get minimum access
 *
 * Does NOT favour orgs with more money, users, or bookings.
 */
export async function computeFairShareScore(
  userId: string,
  orgId: string,
  resourceId: string,
  _startsAt: string,
  needUrgency = 0.5
): Promise<FairShareScore> {
  // Load active policy
  const { data: policies } = await supabase
    .from('fairshare_policy')
    .select('*')
    .eq('is_active', true)
    .limit(1)

  const policy = (policies?.[0] ?? null) as FairSharePolicy | null
  const weights = {
    wait_time: Number(policy?.weight_wait_time ?? 0.30),
    prior_usage: Number(policy?.weight_prior_usage ?? 0.25),
    need_urgency: Number(policy?.weight_need_urgency ?? 0.20),
    owner_priority: Number(policy?.weight_owner_priority ?? 0.15),
    equal_access: Number(policy?.weight_equal_access ?? 0.10),
  }

  // Factor 1: Wait time (how long since user's last booking of this resource)
  const { data: lastBooking } = await supabase
    .from('bookings')
    .select('created_at')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(1)

  let waitTimeFactor = 1.0
  if (lastBooking && lastBooking.length > 0) {
    const daysSince = (Date.now() - new Date(lastBooking[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
    waitTimeFactor = Math.min(daysSince / 30, 1.0)  // Normalise to 30 days
  }

  // Factor 2: Prior usage (inverse — fewer bookings = higher score)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: recentBookings } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', weekAgo)
    .in('status', ['pending_approval', 'confirmed', 'completed'])

  const maxPerWeek = policy?.max_bookings_per_week ?? 5
  const usageFactor = Math.max(0, 1 - (recentBookings ?? 0) / maxPerWeek)

  // Factor 3: Need urgency (provided by caller, 0-1 scale)
  const urgencyFactor = Math.max(0, Math.min(1, needUrgency))

  // Factor 4: Owner priority (resource-owning org gets a small boost)
  const { data: resource } = await supabase
    .from('resources')
    .select('org_id')
    .eq('id', resourceId)
    .single()

  const ownerFactor = resource?.org_id === orgId ? 1.0 : 0.0

  // Factor 5: Equal access (count distinct orgs with recent bookings)
  const { count: distinctOrgs } = await supabase
    .from('bookings')
    .select('org_id', { count: 'exact', head: true })
    .eq('resource_id', resourceId)
    .gte('created_at', weekAgo)
    .in('status', ['confirmed', 'completed'])
    .neq('org_id', orgId)

  const equalAccessFactor = (distinctOrgs ?? 0) > 0 ? 0.8 : 1.0  // Slight boost if fewer orgs have booked

  // Compute weighted total
  const factors = {
    wait_time: waitTimeFactor,
    prior_usage: usageFactor,
    need_urgency: urgencyFactor,
    owner_priority: ownerFactor,
    equal_access: equalAccessFactor,
  }

  const totalScore =
    factors.wait_time * weights.wait_time +
    factors.prior_usage * weights.prior_usage +
    factors.need_urgency * weights.need_urgency +
    factors.owner_priority * weights.owner_priority +
    factors.equal_access * weights.equal_access

  const explanationParts = [
    `Wait time: ${(factors.wait_time * 100).toFixed(0)}%`,
    `Prior usage: ${(factors.prior_usage * 100).toFixed(0)}%`,
    `Urgency: ${(factors.need_urgency * 100).toFixed(0)}%`,
    `Owner priority: ${(factors.owner_priority * 100).toFixed(0)}%`,
    `Equal access: ${(factors.equal_access * 100).toFixed(0)}%`,
  ]

  return {
    total_score: Math.round(totalScore * 10000) / 10000,
    factors,
    explanation: `FairShare score ${totalScore.toFixed(4)}: ${explanationParts.join(', ')}`,
    policy_version: policy?.version ?? 'v1',
  }
}
