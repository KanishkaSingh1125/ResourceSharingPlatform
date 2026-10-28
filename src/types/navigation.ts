import { type ElementType } from 'react'
import { type BadgeVariant } from '@/components/ui'

export type UserRole =
  | 'member' // Organisation Member
  | 'manager' // Resource Manager
  | 'org_admin' // Organisation Administrator
  | 'platform_admin' // Platform Administrator

export interface NavigationSubItem {
  id: string
  label: string
  to: string
  badge?: {
    text: string
    variant?: BadgeVariant
  }
}

export interface NavigationItem {
  id: string
  label: string
  to: string
  icon: ElementType
  roles: UserRole[]
  section?: 'main' | 'management' | 'compliance' | 'system'
  badge?: {
    text: string
    variant?: BadgeVariant
  }
  children?: NavigationSubItem[]
  end?: boolean
}

export interface UserProfile {
  name: string
  email: string
  role: UserRole
  roleLabel: string
  organisation: string
  orgType: string
  avatarUrl?: string
}

