/**
 * types/index.ts
 * Shared TypeScript types for ShareSphere.
 *
 * These types mirror the database schema defined in
 * supabase/migrations/20261028000002_master_backend.sql
 * and provide the frontend integration contract.
 */

// ── API helpers ───────────────────────────────────────────────────────────────

/** Generic wrapper for async data states */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** Standard RPC result from SECURITY DEFINER functions */
export interface RpcResult {
  success: boolean
  error?: string
  [key: string]: unknown
}

// ── Profiles (existing — matches 20261028000001) ─────────────────────────────

export interface Profile {
  id: string
  display_name: string
  email: string
  avatar_url: string | null
  account_status: 'active' | 'suspended' | 'deactivated'
  created_at: string
  updated_at: string
}

// ── Organisations ────────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'additional_information_required'
  | 'approved'
  | 'rejected'
  | 'suspended'

export interface Organisation {
  id: string
  name: string
  slug: string
  description: string
  logo_url: string | null
  website: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  verification_status: VerificationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateOrganisationInput {
  name: string
  slug: string
  description?: string
  website?: string
  contact_email?: string
  contact_phone?: string
  address?: string
}

// ── Organisation Members ─────────────────────────────────────────────────────

export type OrgRole = 'owner' | 'admin' | 'manager' | 'member'

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  invited_by: string | null
  joined_at: string
  // Joined profile data (when queried with select)
  profiles?: Pick<Profile, 'display_name' | 'email' | 'avatar_url'>
}

export interface InviteMemberInput {
  org_id: string
  user_id: string
  role?: OrgRole
}

// ── Verification ─────────────────────────────────────────────────────────────

export interface VerificationDecision {
  id: string
  org_id: string
  previous_status: VerificationStatus
  new_status: VerificationStatus
  reason: string
  decided_by: string
  decided_at: string
}

export type VerificationDocType =
  | 'registration_certificate'
  | 'tax_document'
  | 'insurance'
  | 'identity_proof'
  | 'address_proof'
  | 'other'

export interface VerificationDocument {
  id: string
  org_id: string
  uploaded_by: string
  file_name: string
  file_type: VerificationDocType
  mime_type: string
  file_size_bytes: number
  storage_path: string
  uploaded_at: string
}

export interface UploadDocumentInput {
  org_id: string
  file_name: string
  file_type: VerificationDocType
  mime_type: string
  file_size_bytes: number
  storage_path: string
}

// ── Resource Categories ──────────────────────────────────────────────────────

export interface ResourceCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  sort_order: number
  created_at: string
}

// ── Resources ────────────────────────────────────────────────────────────────

export type ResourceType = 'exclusive' | 'shared'
export type PublicationStatus = 'draft' | 'published' | 'suspended' | 'archived'

export interface Resource {
  id: string
  org_id: string
  category_id: string | null
  name: string
  description: string
  resource_type: ResourceType
  capacity: number
  location: string
  image_urls: string[]
  usage_rules: string
  publication_status: PublicationStatus
  requires_approval: boolean
  max_booking_duration_hours: number
  min_notice_hours: number
  created_by: string
  created_at: string
  updated_at: string
  // Joined data
  organisations?: Pick<Organisation, 'name' | 'slug' | 'verification_status'>
  resource_categories?: Pick<ResourceCategory, 'name' | 'slug' | 'icon'>
}

export interface CreateResourceInput {
  org_id: string
  category_id?: string
  name: string
  description?: string
  resource_type?: ResourceType
  capacity?: number
  location?: string
  image_urls?: string[]
  usage_rules?: string
  requires_approval?: boolean
  max_booking_duration_hours?: number
  min_notice_hours?: number
}

export interface UpdateResourceInput {
  name?: string
  description?: string
  category_id?: string
  resource_type?: ResourceType
  capacity?: number
  location?: string
  image_urls?: string[]
  usage_rules?: string
  publication_status?: PublicationStatus
  requires_approval?: boolean
  max_booking_duration_hours?: number
  min_notice_hours?: number
}

export interface ResourceSearchFilters {
  query?: string
  category_id?: string
  org_id?: string
  resource_type?: ResourceType
  location?: string
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'created_at' | 'capacity'
  sortOrder?: 'asc' | 'desc'
}

// ── Availability & Maintenance ───────────────────────────────────────────────

export interface AvailabilityWindow {
  id: string
  resource_id: string
  day_of_week: number  // 0=Sun .. 6=Sat
  start_time: string   // HH:MM:SS
  end_time: string
}

export interface MaintenanceBlock {
  id: string
  resource_id: string
  reason: string
  starts_at: string
  ends_at: string
  created_by: string
  created_at: string
}

// ── Eligibility ──────────────────────────────────────────────────────────────

export type EligibilityRuleType =
  | 'org_membership'
  | 'org_verification'
  | 'credential'
  | 'training'
  | 'approval_required'
  | 'org_restriction'

export interface EligibilityRule {
  id: string
  resource_id: string
  rule_type: EligibilityRuleType
  rule_config: Record<string, unknown>
  description: string
  is_hard_block: boolean
  created_at: string
}

export interface EligibilityCheckResult {
  eligible: boolean
  reasons: EligibilityReason[]
  next_action: string | null
}

export interface EligibilityReason {
  rule_type: EligibilityRuleType
  passed: boolean
  code: string
  message: string
  is_hard_block: boolean
}

// ── User Credentials ─────────────────────────────────────────────────────────

export interface UserCredential {
  id: string
  user_id: string
  credential_type: string
  credential_name: string
  issued_at: string | null
  expires_at: string | null
  verified: boolean
  verified_by: string | null
  document_url: string | null
  created_at: string
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending_approval'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'rescheduling_requested'
  | 'completed'
  | 'no_show'

export interface Booking {
  id: string
  resource_id: string
  user_id: string
  org_id: string
  status: BookingStatus
  starts_at: string
  ends_at: string
  purpose: string
  notes: string
  idempotency_key: string | null
  approved_by: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  fairshare_score: number | null
  policy_version: string
  created_at: string
  updated_at: string
  // Joined data
  resources?: Pick<Resource, 'name' | 'location' | 'resource_type' | 'org_id'>
  profiles?: Pick<Profile, 'display_name' | 'email'>
}

export interface CreateBookingInput {
  resource_id: string
  starts_at: string
  ends_at: string
  purpose?: string
  notes?: string
  idempotency_key?: string
}

export interface TransitionBookingInput {
  booking_id: string
  new_status: BookingStatus
  reason?: string
}

// ── Booking History ──────────────────────────────────────────────────────────

export interface BookingHistoryEntry {
  id: string
  booking_id: string
  previous_status: BookingStatus | null
  new_status: BookingStatus
  changed_by: string
  reason: string
  changed_at: string
}

// ── Waiting List ─────────────────────────────────────────────────────────────

export interface WaitingListEntry {
  id: string
  resource_id: string
  user_id: string
  org_id: string
  starts_at: string
  ends_at: string
  priority: number
  created_at: string
}

// ── Check-in / Check-out ─────────────────────────────────────────────────────

export type CheckEventType = 'check_in' | 'check_out'

export interface CheckinEvent {
  id: string
  booking_id: string
  event_type: CheckEventType
  recorded_by: string
  notes: string
  recorded_at: string
}

// ── Condition Reports ────────────────────────────────────────────────────────

export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
export type ReportType = 'pre_use' | 'post_use'

export interface ConditionReport {
  id: string
  booking_id: string
  resource_id: string
  report_type: ReportType
  condition: ConditionRating
  description: string
  image_urls: string[]
  reported_by: string
  reported_at: string
}

// ── Incidents ────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed'

export interface Incident {
  id: string
  resource_id: string
  booking_id: string | null
  reported_by: string
  severity: IncidentSeverity
  status: IncidentStatus
  title: string
  description: string
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'verification_update'
  | 'membership_invite'
  | 'incident_reported'
  | 'incident_resolved'
  | 'waitlist_available'
  | 'general'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  metadata: Record<string, unknown>
  is_read: boolean
  created_at: string
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

// ── FairShare Policy ─────────────────────────────────────────────────────────

export interface FairSharePolicy {
  id: string
  version: string
  weight_wait_time: number
  weight_prior_usage: number
  weight_need_urgency: number
  weight_owner_priority: number
  weight_equal_access: number
  max_bookings_per_week: number
  description: string
  is_active: boolean
  created_at: string
}

export interface FairShareScore {
  total_score: number
  factors: {
    wait_time: number
    prior_usage: number
    need_urgency: number
    owner_priority: number
    equal_access: number
  }
  explanation: string
  policy_version: string
}

// ── Legacy aliases (backward compat with Member 1's existing code) ───────────

/** @deprecated Use Organisation instead */
export type UserRole = 'user' | 'org_admin' | 'admin'
/** @deprecated Use Profile instead */
export type UserProfile = Profile
/** @deprecated Use VerificationStatus instead */
export type OrgStatus = 'pending' | 'approved' | 'suspended'
