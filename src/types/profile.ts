import { type UserRole } from './navigation'

export interface UserCredential {
  id: string
  userId: string
  name: string // e.g. "Laser Safety Level 2", "BSL-2 Lab Certified"
  issuingBody: string
  issuedAt: string
  expiresAt?: string
  verificationStatus: 'verified' | 'pending' | 'expired'
  documentUrl?: string
}

export interface Profile {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  phone?: string
  title?: string
  department?: string
  organisationId: string
  organisationName: string
  role: UserRole
  credentials: UserCredential[]
  createdAt: string
  updatedAt: string
}

export interface OrganisationMembership {
  id: string
  organisationId: string
  organisationName: string
  userId: string
  role: UserRole
  status: 'active' | 'invited' | 'suspended'
  joinedAt: string
}

export interface ProfileUpdateInput {
  fullName?: string
  phone?: string
  title?: string
  department?: string
  avatarUrl?: string
}

