import {
  type Booking,
  type BookingDecisionInput,
  type BookingRequestInput,
  type BookingStatus,
} from '@/types/booking'
import { getResourceById } from './resourceService'
import { getCurrentProfile } from './authService'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const STORAGE_KEY_BOOKINGS = 'sharesphere_bookings_v1'

const SEED_BOOKINGS: Booking[] = [
  {
    id: 'book-seed-01',
    resourceId: 'res-cryo-tem-01',
    resourceTitle: 'Cryogenic Transmission Electron Microscope (Cryo-TEM 300kV)',
    resourceCategory: 'Laboratories',
    userId: 'usr-turing-01',
    userName: 'Prof. Alan Turing',
    userEmail: 'turing@mit.edu',
    userOrganisationId: 'org-mit-nanotech-01',
    userOrganisationName: 'MIT Nanotech Core Lab',
    ownerOrganisationId: 'org-mit-nanotech-01',
    ownerOrganisationName: 'MIT Nanotech Core Lab',
    status: 'approved',
    startTime: '2026-11-02T09:00:00Z',
    endTime: '2026-11-02T13:00:00Z',
    purpose: 'High-resolution cryo-EM single particle data acquisition for membrane protein complex.',
    attendeesCount: 2,
    qrPassCode: 'SPHERE-PASS-MIT-90812',
    approvedBy: 'Director of Laboratory Operations',
    approvedAt: '2026-10-25T14:00:00Z',
    createdAt: '2026-10-25T11:30:00Z',
    updatedAt: '2026-10-25T14:00:00Z',
  },
  {
    id: 'book-seed-02',
    resourceId: 'res-dgx-h100-03',
    resourceTitle: 'NVIDIA DGX H100 AI Supercompute Pod (8x H100 SXM5)',
    resourceCategory: 'Computers & High-Compute',
    userId: 'usr-turing-01',
    userName: 'Prof. Alan Turing',
    userEmail: 'turing@mit.edu',
    userOrganisationId: 'org-mit-nanotech-01',
    userOrganisationName: 'MIT Nanotech Core Lab',
    ownerOrganisationId: 'org-cambridge-hpc-02',
    ownerOrganisationName: 'Cambridge High Performance Computing Lab',
    status: 'in_progress',
    startTime: '2026-10-28T08:00:00Z',
    endTime: '2026-10-28T20:00:00Z',
    purpose: 'Distributed fine-tuning of 70B parameter molecular dynamics foundation model.',
    attendeesCount: 1,
    qrPassCode: 'SPHERE-PASS-HPC-44120',
    approvedBy: 'HPC Facility Lead',
    approvedAt: '2026-10-27T16:00:00Z',
    createdAt: '2026-10-27T10:15:00Z',
    updatedAt: '2026-10-28T08:00:00Z',
  },
]

function getStoredBookings(): Record<string, Booking> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS)
    if (!raw) {
      const initial: Record<string, Booking> = {}
      for (const b of SEED_BOOKINGS) {
        initial[b.id] = b
      }
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(initial))
      return initial
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load bookings from storage', err)
    const initial: Record<string, Booking> = {}
    for (const b of SEED_BOOKINGS) {
      initial[b.id] = b
    }
    return initial
  }
}

function saveStoredBookings(data: Record<string, Booking>): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save bookings to storage', err)
  }
}

export async function checkResourceAvailability(
  resourceId: string,
  startTime: string,
  endTime: string
): Promise<{ isAvailable: boolean; conflictReason?: string }> {
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

  // Check against active bookings
  const store = getStoredBookings()
  const conflicts = Object.values(store).filter((b) => {
    if (b.resourceId !== resourceId) return false
    if (b.status === 'rejected' || b.status === 'cancelled') return false

    const bStart = new Date(b.startTime).getTime()
    const bEnd = new Date(b.endTime).getTime()

    // Overlap condition
    return reqStart < bEnd && reqEnd > bStart
  })

  if (conflicts.length > 0) {
    return {
      isAvailable: false,
      conflictReason: `Selected time slot overlaps with an existing ${conflicts[0].status} reservation.`,
    }
  }

  return { isAvailable: true }
}

export async function createBooking(input: BookingRequestInput): Promise<Booking> {
  const resource = await getResourceById(input.resourceId)
  if (!resource) {
    throw new Error('Resource not found.')
  }

  const availability = await checkResourceAvailability(
    input.resourceId,
    input.startTime,
    input.endTime
  )

  if (!availability.isAvailable) {
    throw new Error(availability.conflictReason || 'Resource is not available for requested window.')
  }

  const user = await getCurrentProfile()
  const now = new Date().toISOString()
  const id = `book-${Date.now()}`
  const qrPassCode = `SPHERE-PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`

  // Automatic approval if resource is open access, otherwise pending
  const initialStatus: BookingStatus = resource.accessLevel === 'open' ? 'approved' : 'pending'

  const newBooking: Booking = {
    id,
    resourceId: resource.id,
    resourceTitle: resource.title,
    resourceCategory: resource.category,
    userId: user.id,
    userName: user.fullName,
    userEmail: user.email,
    userOrganisationId: user.organisationId,
    userOrganisationName: user.organisationName,
    ownerOrganisationId: resource.organisationId,
    ownerOrganisationName: resource.organisationName,
    status: initialStatus,
    startTime: input.startTime,
    endTime: input.endTime,
    purpose: input.purpose,
    attendeesCount: input.attendeesCount || 1,
    specialRequirements: input.specialRequirements,
    qrPassCode,
    approvedAt: initialStatus === 'approved' ? now : undefined,
    approvedBy: initialStatus === 'approved' ? 'Automated Open-Access Policy' : undefined,
    createdAt: now,
    updatedAt: now,
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          id,
          resource_id: resource.id,
          user_id: user.id,
          organisation_id: user.organisationId,
          owner_organisation_id: resource.organisationId,
          status: initialStatus,
          start_time: input.startTime,
          end_time: input.endTime,
          purpose: input.purpose,
          attendees_count: input.attendeesCount || 1,
          special_requirements: input.specialRequirements,
          qr_pass_code: qrPassCode,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (!error && data) {
        // saved
      }
    } catch {
      // fallback
    }
  }

  const store = getStoredBookings()
  store[id] = newBooking
  saveStoredBookings(store)

  return newBooking
}

export async function getBookings(filter: {
  userId?: string
  organisationId?: string
  ownerOrganisationId?: string
  status?: BookingStatus
} = {}): Promise<Booking[]> {
  const store = getStoredBookings()
  let list = Object.values(store)

  if (filter.userId) {
    list = list.filter((b) => b.userId === filter.userId)
  }
  if (filter.organisationId) {
    list = list.filter((b) => b.userOrganisationId === filter.organisationId)
  }
  if (filter.ownerOrganisationId) {
    list = list.filter((b) => b.ownerOrganisationId === filter.ownerOrganisationId)
  }
  if (filter.status) {
    list = list.filter((b) => b.status === filter.status)
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return list
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const store = getStoredBookings()
  return store[id] || null
}

export async function decideBooking(input: BookingDecisionInput): Promise<Booking> {
  const store = getStoredBookings()
  const booking = store[input.bookingId]
  if (!booking) {
    throw new Error('Booking not found.')
  }

  const now = new Date().toISOString()
  const updated: Booking = {
    ...booking,
    status: input.decision === 'approve' ? 'approved' : 'rejected',
    rejectionReason: input.decision === 'reject' ? input.reason : undefined,
    approvedAt: input.decision === 'approve' ? now : undefined,
    approvedBy: input.decision === 'approve' ? 'Facility Manager' : undefined,
    updatedAt: now,
  }

  store[input.bookingId] = updated
  saveStoredBookings(store)
  return updated
}

export async function updateBookingCheckIn(
  bookingId: string,
  conditionNotes?: string
): Promise<Booking> {
  const store = getStoredBookings()
  const booking = store[bookingId]
  if (!booking) {
    throw new Error('Booking not found.')
  }

  const now = new Date().toISOString()
  const updated: Booking = {
    ...booking,
    status: 'in_progress',
    checkInTime: now,
    conditionOnCheckout: conditionNotes || 'Asset inspected and checked out in functional operating order.',
    updatedAt: now,
  }

  store[bookingId] = updated
  saveStoredBookings(store)
  return updated
}

export async function updateBookingCheckOut(
  bookingId: string,
  conditionNotes?: string
): Promise<Booking> {
  const store = getStoredBookings()
  const booking = store[bookingId]
  if (!booking) {
    throw new Error('Booking not found.')
  }

  const now = new Date().toISOString()
  const updated: Booking = {
    ...booking,
    status: 'completed',
    checkOutTime: now,
    conditionOnReturn: conditionNotes || 'Resource returned in satisfactory, operational condition.',
    updatedAt: now,
  }

  store[bookingId] = updated
  saveStoredBookings(store)
  return updated
}

