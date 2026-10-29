<<<<<<< HEAD
/**
 * types/index.ts
 * Shared TypeScript types for ShareSphere.
 * Add new types here as the project grows.
 */

// ── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'org_admin' | 'admin'

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  role: UserRole
  createdAt: string
}

// ── Organisation ─────────────────────────────────────────────────────────────

export type OrgStatus = 'pending' | 'approved' | 'suspended'

export interface Organisation {
  id: string
  name: string
  description?: string
  logoUrl?: string
  status: OrgStatus
  adminId: string
  createdAt: string
}

// ── Resource ──────────────────────────────────────────────────────────────────

export type ResourceCategory =
  | 'equipment'
  | 'space'
  | 'vehicle'
  | 'tool'
  | 'other'

export type ResourceStatus = 'available' | 'booked' | 'unavailable'

export interface Resource {
  id: string
  orgId: string
  title: string
  description?: string
  category: ResourceCategory
  status: ResourceStatus
  imageUrl?: string
  createdAt: string
}

// ── Booking ───────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  resourceId: string
  userId: string
  status: BookingStatus
  startDate: string
  endDate: string
  notes?: string
  createdAt: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Generic wrapper for async data states */
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}
=======
export * from './serviceCommon'
export * from './database'
export * from './organisation'
export * from './navigation'
export * from './profile'
export * from './resource'
export * from './booking'
export * from './eligibility'
export * from './notification'
export * from './reportIncident'
export * from './waitingList'
>>>>>>> origin/feature/ui-design
