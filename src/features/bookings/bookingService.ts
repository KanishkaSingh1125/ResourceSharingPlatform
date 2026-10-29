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
import { checkEligibility } from '@/features/eligibility/eligibilityService'
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
  ConditionChecklistItem,
  ConditionReportInput,
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

  const { data, error } = await supabase.rpc('create_booking', {
    _resource_id: input.resource_id,
    _starts_at: input.starts_at,
    _ends_at: input.ends_at,
    _purpose: input.purpose ?? '',
    _notes: input.notes ?? '',
    _idempotency_key: input.idempotency_key ?? null,
  })

  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
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

export async function rescheduleBooking(bookingId: string, startsAt: string, endsAt: string) {
  const { data, error } = await supabase.rpc('reschedule_booking', {
    _booking_id: bookingId,
    _starts_at: startsAt,
    _ends_at: endsAt,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
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
    .select('*, resources(name, location, resource_type, org_id), profiles!user_id(display_name, email)')
    .eq('id', id)
    .single()

  return { data: data as Booking | null, error: error?.message ?? null }
}

export async function getMyBookings(opts: {
  status?: BookingStatus
  page?: number
  pageSize?: number
} = {}): Promise<PaginatedResponse<Booking> & { error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0, page: 1, pageSize: 20, hasMore: false, error: 'Not authenticated' }

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

  const { data, count, error } = await query

  return {
    data: (data ?? []) as Booking[],
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > page * pageSize,
    error: error?.message ?? null,
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
    .select('*, profiles!user_id(display_name, email)')
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
    .select('*, resources(name, location, resource_type, org_id), profiles!user_id(display_name, email)')
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
  starts_at: string
  ends_at: string
}) {
  const { data: result, error } = await supabase.rpc('join_waiting_list', {
    _resource_id: entry.resource_id,
    _starts_at: entry.starts_at,
    _ends_at: entry.ends_at,
  })
  if (error) return { data: null, error: error.message }
  const response = result as RpcResult
  if (!response.success || typeof response.entry_id !== 'string') {
    return { data: null, error: response.error ?? 'Could not join waitlist' }
  }
  const { data, error: readError } = await supabase
    .from('waiting_list')
    .select('*')
    .eq('id', response.entry_id)
    .single()
  return { data: data as WaitingListEntry | null, error: readError?.message ?? null }
}

export async function leaveWaitingList(entryId: string) {
  const { data, error } = await supabase.rpc('leave_waiting_list', { _entry_id: entryId })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function claimWaitlistOffer(entryId: string) {
  const { data, error } = await supabase.rpc('claim_waitlist_offer', { _entry_id: entryId })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function allocateWaitlistSlot(input: {
  resource_id: string
  starts_at: string
  ends_at: string
}) {
  const { data, error } = await supabase.rpc('allocate_waitlist_slot', {
    _resource_id: input.resource_id,
    _starts_at: input.starts_at,
    _ends_at: input.ends_at,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function prioritizeWaitlistEntry(entryId: string, reason: string) {
  const { data, error } = await supabase.rpc('prioritize_waitlist_entry', {
    _entry_id: entryId,
    _reason: reason,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
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

export async function issueBookingQrToken(bookingId: string, eventType: 'check_in' | 'check_out') {
  const { data, error } = await supabase.rpc('issue_booking_qr_token', {
    _booking_id: bookingId,
    _event_type: eventType,
  })
  if (error) return { token: null, expires_at: null, error: error.message }
  const result = data as RpcResult
  if (!result.success || typeof result.token !== 'string') {
    return { token: null, expires_at: null, error: result.error ?? 'Could not issue QR token' }
  }
  return {
    token: result.token,
    expires_at: typeof result.expires_at === 'string' ? result.expires_at : null,
    error: null,
  }
}

export async function consumeBookingQrToken(
  token: string,
  resourceId: string,
  eventType: 'check_in' | 'check_out',
  notes = ''
) {
  const { data, error } = await supabase.rpc('consume_booking_qr_token', {
    _token: token,
    _resource_id: resourceId,
    _event_type: eventType,
    _notes: notes,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

/** @deprecated QR tokens are required; call consumeBookingQrToken with the scanned token. */
export async function recordCheckin(_bookingId: string, _eventType: 'check_in' | 'check_out', _notes = '') {
  return { data: null, error: 'QR token required; use consumeBookingQrToken with the scanned token.' }
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

export async function getConditionChecklist(resourceId: string) {
  const { data, error } = await supabase
    .from('condition_checklist_items')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('is_active', true)
    .order('sort_order')
  return { data: (data ?? []) as ConditionChecklistItem[], error: error?.message ?? null }
}

export async function saveConditionChecklistItem(input: Omit<ConditionChecklistItem, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('condition_checklist_items')
    .upsert(input, { onConflict: 'resource_id,item_key' })
    .select()
    .single()
  return { data: data as ConditionChecklistItem | null, error: error?.message ?? null }
}

export async function submitConditionReport(report: ConditionReportInput) {
  const { data: result, error } = await supabase.rpc('submit_condition_report', {
    _booking_id: report.booking_id,
    _resource_id: report.resource_id,
    _report_type: report.report_type,
    _condition: report.condition,
    _description: report.description ?? '',
    _checklist: report.checklist ?? {},
    _damage_flag: report.damage_flag ?? false,
  })
  if (error) return { data: null, error: error.message, incident_id: null as string | null }
  const response = result as RpcResult
  if (!response.success || typeof response.report_id !== 'string') {
    return { data: null, error: response.error ?? 'Condition report failed', incident_id: null as string | null }
  }
  const { data, error: readError } = await supabase
    .from('condition_reports')
    .select('*')
    .eq('id', response.report_id)
    .single()
  return {
    data: data as ConditionReport | null,
    error: readError?.message ?? null,
    incident_id: typeof response.incident_id === 'string' ? response.incident_id : null,
  }
}

export async function uploadConditionEvidence(reportId: string, bookingId: string, file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    return { data: null, error: 'Evidence must be a JPEG, PNG, or WebP image up to 10 MB.' }
  }
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'evidence'
  const path = `${bookingId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from('condition-evidence')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { data: null, error: uploadError.message }

  const { data, error } = await supabase.rpc('register_condition_evidence', {
    _report_id: reportId,
    _storage_path: path,
    _mime_type: file.type,
    _file_size_bytes: file.size,
  })
  const result = data as RpcResult | null
  if (error || !result?.success) {
    await supabase.storage.from('condition-evidence').remove([path])
    return { data: null, error: error?.message ?? result?.error ?? 'Could not attach evidence metadata' }
  }
  return { data: result, error: null }
}

export async function getConditionReports(bookingId: string) {
  const { data, error } = await supabase
    .from('condition_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('reported_at')

  return { data: (data ?? []) as ConditionReport[], error: error?.message ?? null }
}
