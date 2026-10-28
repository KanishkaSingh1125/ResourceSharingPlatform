export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

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
}

export interface BookingDecisionInput {
  bookingId: string
  decision: 'approve' | 'reject'
  reason?: string
}

export interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  bookingId?: string
}

