import { type VerificationStatus } from './organisation'
import { type PaginationParams, type SortDirection } from './serviceCommon'

export type ResourceCategory =
  | 'Laboratories'
  | 'Computers & High-Compute'
  | 'Fabrication & 3D Printing'
  | 'Cameras & Imaging'
  | 'Testing & Measurement'
  | 'Meeting & Event Spaces'
  | 'Chemical & Bio Processing'

export type ResourceType =
  | 'equipment'
  | 'space'
  | 'tool'
  | 'lab'
  | 'compute'

export type ResourceAvailabilityStatus =
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'reserved'
  | 'unavailable'

export type ResourceAccessLevel =
  | 'open'
  | 'members_only'
  | 'approval_required'

export interface ResourceLocation {
  campus: string
  building: string
  room?: string
  address: string
  city: string
  state?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface ResourceRate {
  amount: number
  unit: 'hour' | 'day' | 'slot' | 'free'
  currency: string
}

export interface ResourceOperatingHours {
  days: string[] // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  openTime: string // e.g. "08:00"
  closeTime: string // e.g. "20:00"
}

export interface Resource {
  id: string
  organisationId: string
  organisationName: string
  organisationSlug?: string
  organisationType?: string
  isOrgVerified: boolean
  orgVerificationStatus: VerificationStatus
  title: string
  slug: string
  description: string
  category: ResourceCategory
  resourceType: ResourceType
  images: string[]
  location: ResourceLocation
  capacity?: number
  isAccessible: boolean // Physical/wheelchair/ADA accessible
  availabilityStatus: ResourceAvailabilityStatus
  accessLevel: ResourceAccessLevel
  rate: ResourceRate
  usageRules: string[]
  requiredCredentials: string[] // Certifications, e.g. "Laser Safety Level 1", "Cleanroom Protocol"
  bookingConditions: string[] // e.g. "Must book 24h in advance", "Staff supervision required"
  specifications: Record<string, string> // e.g. { "Resolution": "0.1nm", "Voltage": "200kV" }
  operatingHours?: ResourceOperatingHours
  maintenanceSchedule?: {
    nextMaintenanceDate?: string
    notes?: string
  }
  createdAt: string
  updatedAt: string
}

export type ResourceSortField = 'createdAt' | 'title' | 'rate' | 'availability'

export interface ResourceFilterParams extends PaginationParams {
  search?: string
  category?: ResourceCategory | 'all'
  resourceType?: ResourceType | 'all'
  organisationId?: string
  isOrgVerified?: boolean
  verificationStatus?: VerificationStatus | 'all'
  availabilityStatus?: ResourceAvailabilityStatus | 'all'
  accessLevel?: ResourceAccessLevel | 'all'
  minCapacity?: number
  isAccessible?: boolean
  requiresNoSpecialCredentials?: boolean
  requiredCredential?: string
  availableDate?: string // ISO date string YYYY-MM-DD
  availableTime?: string // HH:mm
  city?: string
  sortBy?: ResourceSortField
  sortDirection?: SortDirection
}

export interface ResourceCreateInput {
  organisationId: string
  title: string
  description: string
  category: ResourceCategory
  resourceType: ResourceType
  images?: string[]
  location: ResourceLocation
  capacity?: number
  isAccessible?: boolean
  accessLevel?: ResourceAccessLevel
  rate: ResourceRate
  usageRules?: string[]
  requiredCredentials?: string[]
  bookingConditions?: string[]
  specifications?: Record<string, string>
  operatingHours?: ResourceOperatingHours
}

export interface ResourceUpdateInput extends Partial<ResourceCreateInput> {
  availabilityStatus?: ResourceAvailabilityStatus
}

