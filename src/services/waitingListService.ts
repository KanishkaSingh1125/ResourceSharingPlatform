import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { type JoinWaitingListInput, type WaitingListAlternative, type WaitingListEntry, type WaitingListOfferDecision } from '@/types/waitingList'

const WAITING_LIST_STATUSES: WaitingListEntry['status'][] = [
  'waiting',
  'awaiting_decision',
  'offered',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
  'allocated',
  'not_allocated',
]

function requireBackend(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Waiting-list actions require a configured Supabase backend.')
  }
}

async function requireCurrentUser(): Promise<string> {
  requireBackend()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Could not verify your session: ${error.message}`)
  if (!data.user) throw new Error('Sign in before managing a waiting list.')
  return data.user.id
}

function parseEntry(value: unknown): WaitingListEntry {
  if (!value || typeof value !== 'object') {
    throw new Error('The waiting-list service returned an invalid record.')
  }
  const row = value as Record<string, unknown>
  if (
    typeof row.id !== 'string' ||
    typeof row.resource_id !== 'string' ||
    typeof row.resource_title !== 'string' ||
    typeof row.start_time !== 'string' ||
    typeof row.end_time !== 'string' ||
    typeof row.purpose !== 'string' ||
    typeof row.status !== 'string' ||
    !WAITING_LIST_STATUSES.includes(row.status as WaitingListEntry['status']) ||
    typeof row.queue_position_visible !== 'boolean' ||
    typeof row.updated_at !== 'string'
  ) {
    throw new Error('The waiting-list service returned an incomplete record.')
  }
  if (row.queue_position !== null && typeof row.queue_position !== 'number') {
    throw new Error('The waiting-list service returned an invalid queue position.')
  }
  if (row.offer_expires_at !== null && typeof row.offer_expires_at !== 'string') {
    throw new Error('The waiting-list service returned an invalid offer expiry.')
  }
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceTitle: row.resource_title,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    status: row.status as WaitingListEntry['status'],
    queuePosition: row.queue_position as number | null,
    queuePositionVisible: row.queue_position_visible,
    offerExpiresAt: row.offer_expires_at as string | null,
    outcomeReason: typeof row.outcome_reason === 'string' ? row.outcome_reason : null,
    allocationExplanation:
      typeof row.allocation_explanation === 'string' ? row.allocation_explanation : null,
    updatedAt: row.updated_at,
  }
}

export async function getMyWaitingList(): Promise<WaitingListEntry[]> {
  await requireCurrentUser()
  const { data, error } = await supabase.rpc('get_my_waitlist_entries')
  if (error) throw new Error(`Could not load your waiting list: ${error.message}`)
  if (!Array.isArray(data)) {
    throw new Error('The waiting-list service returned an invalid list.')
  }
  return data.map(parseEntry)
}

export async function joinWaitingList(input: JoinWaitingListInput): Promise<WaitingListEntry> {
  await requireCurrentUser()
  if (!input.idempotencyKey.trim()) {
    throw new Error('A retry-safe waiting-list request key is required.')
  }
  if (!input.purpose.trim()) {
    throw new Error('Describe the intended use before joining a waiting list.')
  }
  const start = new Date(input.startTime)
  const end = new Date(input.endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error('Choose a valid time window before joining a waiting list.')
  }
  const { data, error } = await supabase.rpc('join_waitlist', {
    p_resource_id: input.resourceId,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_purpose: input.purpose.trim(),
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have an active waiting-list request for this time window.')
    }
    throw new Error(`Could not join the waiting list: ${error.message}`)
  }
  return parseEntry(data)
}

export async function leaveWaitingList(entryId: string): Promise<WaitingListEntry> {
  await requireCurrentUser()
  const { data, error } = await supabase.rpc('leave_waitlist', { p_waitlist_id: entryId })
  if (error) throw new Error(`Could not leave the waiting list: ${error.message}`)
  return parseEntry(data)
}

export async function respondToWaitingListOffer(
  entryId: string,
  decision: WaitingListOfferDecision
): Promise<WaitingListEntry> {
  await requireCurrentUser()
  const { data, error } = await supabase.rpc('respond_to_waitlist_offer', {
    p_waitlist_id: entryId,
    p_decision: decision,
  })
  if (error) {
    if (error.message.toLowerCase().includes('expired')) {
      throw new Error('This offer has expired. Refresh your waiting-list status for the latest outcome.')
    }
    throw new Error(`Could not ${decision} the offer: ${error.message}`)
  }
  return parseEntry(data)
}

export async function getWaitingListAlternatives(entryId: string): Promise<WaitingListAlternative[]> {
  await requireCurrentUser()
  const { data, error } = await supabase.rpc('get_waitlist_alternatives', {
    p_waitlist_id: entryId,
  })
  if (error) throw new Error(`Could not load alternative resources: ${error.message}`)
  if (!Array.isArray(data)) {
    throw new Error('The allocation service returned invalid alternatives.')
  }
  return data.map((value: unknown) => {
    if (!value || typeof value !== 'object') {
      throw new Error('The allocation service returned an invalid alternative.')
    }
    const row = value as Record<string, unknown>
    if (
      typeof row.resource_id !== 'string' ||
      typeof row.resource_title !== 'string' ||
      typeof row.start_time !== 'string' ||
      typeof row.end_time !== 'string'
    ) {
      throw new Error('The allocation service returned an incomplete alternative.')
    }
    return {
      resourceId: row.resource_id,
      resourceTitle: row.resource_title,
      startTime: row.start_time,
      endTime: row.end_time,
      explanation: typeof row.explanation === 'string' ? row.explanation : null,
    }
  })
}
