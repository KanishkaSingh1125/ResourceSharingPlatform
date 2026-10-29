import {
  type Booking,
  type BookingDecisionInput,
  type BookingRequestInput,
  type BookingStatus,
  type AvailableSlot,
} from '@/types/booking'
import { getResourceById } from './resourceService'
import { getCurrentProfile, getProfileById } from './authService'
import { getOrganisationById } from './organisationService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { type Database } from '@/types/database'

type BookingRow = Omit<Database['public']['Tables']['bookings']['Row'], 'qr_pass_code'>
const BOOKING_FIELDS =
  'id,resource_id,user_id,organisation_id,owner_organisation_id,status,start_time,end_time,purpose,attendees_count,special_requirements,check_in_time,check_out_time,condition_on_checkout,condition_on_return,rejection_reason,approved_by,approved_at,created_at,updated_at'

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'approved',
  'confirmed',
  'rescheduling_requested',
  'in_progress',
]

function requireBackend(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Booking actions require a configured Supabase backend.')
  }
}

async function requireCurrentUser() {
  requireBackend()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Could not verify your session: ${error.message}`)
  if (!data.user) throw new Error('Sign in before managing bookings.')

  const profile = await getCurrentProfile()
  if (profile.id !== data.user.id) {
    throw new Error('Your authenticated profile could not be verified.')
  }
  return profile
}

async function toBooking(row: BookingRow): Promise<Booking> {
  const [resource, requester, userOrg, ownerOrg] = await Promise.all([
    getResourceById(row.resource_id),
    getProfileById(row.user_id),
    getOrganisationById(row.organisation_id),
    getOrganisationById(row.owner_organisation_id),
  ])
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceTitle: resource?.title || 'Resource',
    resourceCategory: resource?.category || 'Uncategorised',
    userId: row.user_id,
    userName: requester?.fullName || 'Requester',
    userEmail: requester?.email || '',
    userOrganisationId: row.organisation_id,
    userOrganisationName: userOrg?.name || 'Organisation',
    ownerOrganisationId: row.owner_organisation_id,
    ownerOrganisationName: ownerOrg?.name || 'Host organisation',
    status: row.status as BookingStatus,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    attendeesCount: row.attendees_count ?? undefined,
    specialRequirements: row.special_requirements ?? undefined,
    checkInTime: row.check_in_time ?? undefined,
    checkOutTime: row.check_out_time ?? undefined,
    conditionOnCheckout: row.condition_on_checkout ?? undefined,
    conditionOnReturn: row.condition_on_return ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getActiveBookingsForWindow(
  resourceId: string,
  startTime: Date,
  endTime: Date
): Promise<Array<{ start_time: string; end_time: string; status: string }>> {
  requireBackend()
  const { data, error } = await supabase
    .from('bookings')
    .select('start_time,end_time,status')
    .eq('resource_id', resourceId)
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString())

  if (error) throw new Error(`Could not load availability: ${error.message}`)
  return (data || []).filter((booking: { status: string }) =>
    ACTIVE_BOOKING_STATUSES.includes(booking.status as BookingStatus)
  )
}

export async function checkResourceAvailability(
  resourceId: string,
  startTime: string,
  endTime: string
): Promise<{ isAvailable: boolean; conflictReason?: string }> {
  requireBackend()
  const resource = await getResourceById(resourceId)
  if (!resource) {
    return { isAvailable: false, conflictReason: 'Resource does not exist.' }
  }

  if (resource.availabilityStatus === 'unavailable') {
    return { isAvailable: false, conflictReason: 'Resource is currently flagged as unavailable.' }
  }

  if (resource.availabilityStatus === 'maintenance') {
    return {
      isAvailable: false,
      conflictReason: 'Resource is undergoing scheduled maintenance and calibration.',
    }
  }

  const reqStart = new Date(startTime).getTime()
  const reqEnd = new Date(endTime).getTime()

  if (isNaN(reqStart) || isNaN(reqEnd)) {
    return { isAvailable: false, conflictReason: 'Invalid reservation time window format.' }
  }

  if (reqStart >= reqEnd) {
    return { isAvailable: false, conflictReason: 'Reservation end time must be after start time.' }
  }

  const conflicts = await getActiveBookingsForWindow(
    resourceId,
    new Date(reqStart),
    new Date(reqEnd)
  )

  if (conflicts.length > 0) {
    return {
      isAvailable: false,
      conflictReason: `Selected time slot overlaps with an existing ${conflicts[0].status} booking.`,
    }
  }

  return { isAvailable: true }
}

export async function getAvailableSlots(
  resourceId: string,
  date: string,
  durationMinutes: number,
  intervalMinutes = 30
): Promise<AvailableSlot[]> {
  requireBackend()
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
    throw new Error('Booking duration must be a positive number of minutes.')
  }
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1) {
    throw new Error('Slot interval must be a positive number of minutes.')
  }

  const resource = await getResourceById(resourceId)
  if (!resource) throw new Error('Resource not found.')
  if (resource.availabilityStatus !== 'available') return []

  const dayStart = new Date(`${date}T00:00:00`)
  if (Number.isNaN(dayStart.getTime())) throw new Error('Select a valid booking date.')
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const bookings = await getActiveBookingsForWindow(resourceId, dayStart, dayEnd)
  const operatingHours = resource.operatingHours
  if (!operatingHours) return []

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (!operatingHours.days.includes(dayNames[dayStart.getDay()])) return []

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  const openMinutes = toMinutes(operatingHours.openTime)
  const closeMinutes = toMinutes(operatingHours.closeTime)
  const available: AvailableSlot[] = []
  const now = Date.now()

  for (
    let start = openMinutes;
    start + durationMinutes <= closeMinutes;
    start += intervalMinutes
  ) {
    const localStart = new Date(dayStart)
    localStart.setMinutes(start)
    const localEnd = new Date(localStart.getTime() + durationMinutes * 60_000)
    if (localStart.getTime() <= now) continue
    const overlaps = bookings.some(
      (booking) =>
        localStart.getTime() < new Date(booking.end_time).getTime() &&
        localEnd.getTime() > new Date(booking.start_time).getTime()
    )
    if (!overlaps) {
      available.push({
        startTime: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        endTime: `${String(Math.floor((start + durationMinutes) / 60)).padStart(2, '0')}:${String((start + durationMinutes) % 60).padStart(2, '0')}`,
      })
    }
  }
  return available
}

export async function createBooking(input: BookingRequestInput): Promise<Booking> {
  const user = await requireCurrentUser()
  const resource = await getResourceById(input.resourceId)
  if (!resource) {
    throw new Error('Resource not found.')
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error('A retry-safe booking request key is required.')
  }
  if (!input.purpose.trim()) {
    throw new Error('Describe the intended use before submitting a booking request.')
  }
  const attendeesCount = input.attendeesCount ?? 1
  if (!Number.isInteger(attendeesCount) || attendeesCount < 1) {
    throw new Error('Attendee count must be a positive whole number.')
  }
  if (resource.capacity && attendeesCount > resource.capacity) {
    throw new Error(`This resource supports at most ${resource.capacity} attendees.`)
  }

  const availability = await checkResourceAvailability(
    input.resourceId,
    input.startTime,
    input.endTime
  )

  if (!availability.isAvailable) {
    throw new Error(availability.conflictReason || 'Resource is not available for requested window.')
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      id: input.idempotencyKey,
      resource_id: resource.id,
      user_id: user.id,
      organisation_id: user.organisationId,
      owner_organisation_id: resource.organisationId,
      start_time: input.startTime,
      end_time: input.endTime,
      purpose: input.purpose,
      attendees_count: attendeesCount,
      special_requirements: input.specialRequirements,
    })
    .select(BOOKING_FIELDS)
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('bookings')
        .select(BOOKING_FIELDS)
        .eq('id', input.idempotencyKey)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!existingError && existing) return toBooking(existing)
    }
    throw new Error(
      error.code === '23P01' || error.code === '23505'
        ? 'That time slot was just booked. Refresh availability and choose another slot.'
        : `Booking could not be submitted: ${error.message}`
    )
  }
  if (!data) throw new Error('The backend did not confirm the booking request.')
  return toBooking(data as BookingRow)
}

export async function getBookings(filter: {
  userId?: string
  organisationId?: string
  ownerOrganisationId?: string
  status?: BookingStatus
} = {}): Promise<Booking[]> {
  await requireCurrentUser()
  let query = supabase.from('bookings').select(BOOKING_FIELDS).order('created_at', { ascending: false })
  if (filter.userId) query = query.eq('user_id', filter.userId)
  if (filter.organisationId) query = query.eq('organisation_id', filter.organisationId)
  if (filter.ownerOrganisationId) query = query.eq('owner_organisation_id', filter.ownerOrganisationId)
  if (filter.status) query = query.eq('status', filter.status)

  const { data, error } = await query
  if (error) throw new Error(`Could not load bookings: ${error.message}`)
  return Promise.all((data || []).map((row: BookingRow) => toBooking(row)))
}

export async function getBookingById(id: string): Promise<Booking | null> {
  await requireCurrentUser()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_FIELDS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Could not load booking: ${error.message}`)
  return data ? toBooking(data as BookingRow) : null
}

export async function decideBooking(input: BookingDecisionInput): Promise<Booking> {
  const profile = await requireCurrentUser()
  if (!['manager', 'org_admin', 'platform_admin'].includes(profile.role)) {
    throw new Error('Only an authorised organisation manager can review booking requests.')
  }
  if (input.decision === 'reject' && !input.reason?.trim()) {
    throw new Error('Provide a reason when rejecting a booking.')
  }

  const now = new Date().toISOString()
  let update = supabase
    .from('bookings')
    .update({
      status: input.decision === 'approve' ? 'approved' : 'rejected',
      rejection_reason: input.decision === 'reject' ? input.reason?.trim() : null,
      approved_by: input.decision === 'approve' ? profile.id : null,
      approved_at: input.decision === 'approve' ? now : null,
      updated_at: now,
    })
    .eq('id', input.bookingId)
    .eq('owner_organisation_id', profile.organisationId)
    .eq('status', 'pending')
  const { data, error } = await update.select(BOOKING_FIELDS).maybeSingle()
  if (error) throw new Error(`Could not update booking: ${error.message}`)
  if (!data) throw new Error('This request is no longer pending or you cannot manage it.')
  return toBooking(data as BookingRow)
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const profile = await requireCurrentUser()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('user_id', profile.id)
    .in('status', ['pending', 'approved', 'confirmed'])
    .select(BOOKING_FIELDS)
    .maybeSingle()
  if (error) throw new Error(`Could not cancel booking: ${error.message}`)
  if (!data) throw new Error('This booking cannot be cancelled or is no longer active.')
  return toBooking(data as BookingRow)
}

export async function requestBookingReschedule(
  _bookingId: string,
  _startTime: string,
  _endTime: string,
  _reason: string
): Promise<never> {
  requireBackend()
  throw new Error(
    'Rescheduling is unavailable until the backend contract and persistence fields are deployed.'
  )
}

export async function markBookingNoShow(bookingId: string): Promise<Booking> {
  const profile = await requireCurrentUser()
  if (!['manager', 'org_admin', 'platform_admin'].includes(profile.role)) {
    throw new Error('Only an authorised organisation manager can mark a no-show.')
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'no_show', updated_at: now })
    .eq('id', bookingId)
    .eq('owner_organisation_id', profile.organisationId)
    .in('status', ['approved', 'confirmed'])
    .lt('end_time', now)
    .select(BOOKING_FIELDS)
    .maybeSingle()
  if (error) throw new Error(`Could not mark booking as no-show: ${error.message}`)
  if (!data) throw new Error('This booking cannot be marked as a no-show.')
  return toBooking(data as BookingRow)
}

export async function updateBookingCheckIn(
  _bookingId: string,
  _conditionNotes?: string
): Promise<Booking> {
  requireBackend()
  throw new Error(
    'Secure check-in is unavailable until the backend can validate and consume a one-time handover credential.'
  )
}

export async function updateBookingCheckOut(
  _bookingId: string,
  _conditionNotes?: string
): Promise<Booking> {
  requireBackend()
  throw new Error(
    'Secure check-out is unavailable until the backend can validate and consume a one-time handover credential.'
  )
}
