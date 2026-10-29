import { createContext, useContext } from 'react'
import {
  type UserRole,
  type UserProfile,
} from '@/types/navigation'
import {
  ROLE_DEFINITIONS,
  getNavigationForRole,
} from '@/config/navigation'

export interface RoleContextType {
  currentRole: UserRole
  userProfile: UserProfile
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  refreshProfile: () => Promise<void>
  roleMeta: (typeof ROLE_DEFINITIONS)[UserRole]
  navItems: ReturnType<typeof getNavigationForRole>
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void
  toggleCollapse: () => void
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function useRole(): RoleContextType {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
