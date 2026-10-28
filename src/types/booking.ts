export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'rescheduling_requested'
  | 'in_progress'
  | 'completed'
  | 'no_show'

export interface Booking {
  id: string
  resourceId: string
  resourceTitle: string
  resourceCategory: string
  userId: string
  userName: string
  userEmail: string
  userOrganisationId: string
  userOrganisationName: string
  ownerOrganisationId: string
  ownerOrganisationName: string
  status: BookingStatus
  startTime: string // ISO string
  endTime: string // ISO string
  purpose: string
  attendeesCount?: number
  specialRequirements?: string
  qrPassCode?: string
  checkInTime?: string
  checkOutTime?: string
  conditionOnCheckout?: string
  conditionOnReturn?: string
  rejectionReason?: string
  cancellationReason?: string
  rescheduleReason?: string
  requestedStartTime?: string
  requestedEndTime?: string
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BookingRequestInput {
  resourceId: string
  startTime: string
  endTime: string
  purpose: string
  attendeesCount?: number
  specialRequirements?: string
  idempotencyKey: string
}

export interface BookingDecisionInput {
  bookingId: string
  decision: 'approve' | 'reject'
  reason?: string
}

export interface AvailableSlot {
  startTime: string
  endTime: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  bookingId?: string
}
