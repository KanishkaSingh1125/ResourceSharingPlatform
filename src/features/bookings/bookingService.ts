/**
 * features/bookings/bookingService.ts
 *
 * Transactional booking engine: create, transition, list, and history.
 * Booking creation and status transitions use SECURITY DEFINER RPC
 * functions that enforce concurrency safety, validation, and audit.
 *
 * Clients CANNOT confirm bookings directly — only resource-owning
 * org managers can confirm via transition_booking_status().
 */

import { supabase } from '@/lib/supabase'
import { checkEligibility, computeFairShareScore } from '@/features/eligibility/eligibilityService'
import type {
  Booking,
  CreateBookingInput,
  TransitionBookingInput,
  BookingHistoryEntry,
  BookingStatus,
  WaitingListEntry,
  CheckinEvent,
  ConditionReport,
  PaginatedResponse,
  RpcResult,
} from '@/types'

// ── Booking Creation (via RPC) ───────────────────────────────────────────────

/**
 * Create a booking via the concurrency-safe create_booking() RPC.
 * Validates resource availability, conflicts, maintenance, and user eligibility.
 * Supports idempotency_key to prevent duplicate submissions.
 */
export async function createBooking(input: CreateBookingInput) {
  // Step 1: Verify eligibility
  // Retrieve the authenticated user safely
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return { success: false, error: authError?.message ?? 'Not authenticated' } as RpcResult
  }
  const user = authData.user

  const eligibility = await checkEligibility(user.id, input.resource_id)
  if (!eligibility.eligible) {
    return {
      success: false,
      error: 'Eligibility check failed: ' + (eligibility.reasons.map(r => r.message).join('; ')),
    } as RpcResult
  }

  // Step 2: Compute FairShare score
  const { data: orgData } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()
  const orgId = orgData?.org_id as string | undefined
  const fairshare = orgId
    ? await computeFairShareScore(user.id, orgId, input.resource_id, input.starts_at)
    : null

  // Step 3: Create booking via RPC (initially without score)
  const { data, error } = await supabase.rpc('create_booking', {
    _resource_id: input.resource_id,
    _starts_at: input.starts_at,
    _ends_at: input.ends_at,
    _purpose: input.purpose ?? '',
    _notes: input.notes ?? '',
    _idempotency_key: input.idempotency_key ?? null,
  })

  if (error) return { success: false, error: error.message } as RpcResult
  const result = data as RpcResult

  // Step 4: If scoring succeeded, patch the booking record
  if (fairshare && result.success && result.booking_id) {
    await supabase
      .from('bookings')
      .update({
        fairshare_score: fairshare.total_score,
        policy_version: fairshare.policy_version,
      })
      .eq('id', result.booking_id)
  }

  return result
}

// ── Booking Status Transition (via RPC) ──────────────────────────────────────

/**
 * Transition a booking to a new status via the server-enforced
 * transition_booking_status() RPC. Validates permissions and valid transitions.
 */
export async function transitionBookingStatus(input: TransitionBookingInput) {
  const { data, error } = await supabase.rpc('transition_booking_status', {
    _booking_id: input.booking_id,
    _new_status: input.new_status,
    _reason: input.reason ?? '',
  })

  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export function confirmBooking(bookingId: string, reason = '') {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'confirmed',
    reason,
  })
}

export function rejectBooking(bookingId: string, reason: string) {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'rejected',
    reason,
  })
}

export function cancelBooking(bookingId: string, reason: string) {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'cancelled',
    reason,
  })
}

export function requestReschedule(bookingId: string, reason: string) {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'rescheduling_requested',
    reason,
  })
}

export function completeBooking(bookingId: string) {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'completed',
    reason: 'Booking completed',
  })
}

export function markNoShow(bookingId: string) {
  return transitionBookingStatus({
    booking_id: bookingId,
    new_status: 'no_show',
    reason: 'User did not show up',
  })
}

// ── Booking Queries ──────────────────────────────────────────────────────────

export async function getBooking(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, resources(name, location, resource_type, org_id), profiles(display_name, email)')
    .eq('id', id)
    .single()

  return { data: data as Booking | null, error: error?.message ?? null }
}

export async function getMyBookings(opts: {
  status?: BookingStatus
  page?: number
  pageSize?: number
} = {}): Promise<PaginatedResponse<Booking>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0, page: 1, pageSize: 20, hasMore: false }

  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('bookings')
    .select('*, resources(name, location, resource_type, org_id)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('starts_at', { ascending: false })
    .range(from, to)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, count } = await query

  return {
    data: (data ?? []) as Booking[],
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > page * pageSize,
  }
}

/**
 * Get bookings for a specific resource (for org managers).
 */
export async function getResourceBookings(resourceId: string, opts: {
  status?: BookingStatus
  from_date?: string
  to_date?: string
} = {}) {
  let query = supabase
    .from('bookings')
    .select('*, profiles(display_name, email)')
    .eq('resource_id', resourceId)
    .order('starts_at')

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.from_date) query = query.gte('starts_at', opts.from_date)
  if (opts.to_date) query = query.lte('ends_at', opts.to_date)

  const { data, error } = await query

  return { data: (data ?? []) as Booking[], error: error?.message ?? null }
}

/**
 * Get pending bookings for an organisation (for managers to review).
 */
export async function getOrgPendingBookings(orgId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, resources(name, location, resource_type, org_id), profiles(display_name, email)')
    .eq('org_id', orgId)
    .eq('status', 'pending_approval')
    .order('created_at')

  return { data: (data ?? []) as Booking[], error: error?.message ?? null }
}

// ── Booking History ──────────────────────────────────────────────────────────

export async function getBookingHistory(bookingId: string) {
  const { data, error } = await supabase
    .from('booking_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('changed_at')

  return { data: (data ?? []) as BookingHistoryEntry[], error: error?.message ?? null }
}

// ── Waiting List ─────────────────────────────────────────────────────────────

export async function joinWaitingList(entry: {
  resource_id: string
  org_id: string
  starts_at: string
  ends_at: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('waiting_list')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single()

  return { data: data as WaitingListEntry | null, error: error?.message ?? null }
}

export async function leaveWaitingList(entryId: string) {
  const { error } = await supabase
    .from('waiting_list')
    .delete()
    .eq('id', entryId)

  return { error: error?.message ?? null }
}

export async function getMyWaitingList() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('waiting_list')
    .select('*, resources(name, location)')
    .eq('user_id', user.id)
    .order('created_at')

  return { data: (data ?? []) as WaitingListEntry[], error: error?.message ?? null }
}

// ── Check-in / Check-out ─────────────────────────────────────────────────────

export async function recordCheckin(bookingId: string, eventType: 'check_in' | 'check_out', notes = '') {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('checkin_events')
    .insert({ booking_id: bookingId, event_type: eventType, recorded_by: user.id, notes })
    .select()
    .single()

  return { data: data as CheckinEvent | null, error: error?.message ?? null }
}

export async function getCheckinEvents(bookingId: string) {
  const { data, error } = await supabase
    .from('checkin_events')
    .select('*')
    .eq('booking_id', bookingId)
    .order('recorded_at')

  return { data: (data ?? []) as CheckinEvent[], error: error?.message ?? null }
}

// ── Condition Reports ────────────────────────────────────────────────────────

export async function submitConditionReport(report: {
  booking_id: string
  resource_id: string
  report_type: 'pre_use' | 'post_use'
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
  description?: string
  image_urls?: string[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('condition_reports')
    .insert({ ...report, reported_by: user.id })
    .select()
    .single()

  return { data: data as ConditionReport | null, error: error?.message ?? null }
}

export async function getConditionReports(bookingId: string) {
  const { data, error } = await supabase
    .from('condition_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('reported_at')

  return { data: (data ?? []) as ConditionReport[], error: error?.message ?? null }
}
