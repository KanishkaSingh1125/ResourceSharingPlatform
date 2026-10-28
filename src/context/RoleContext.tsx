import {
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { type UserRole } from '@/types/navigation'
import {
  MOCK_USER_PROFILES,
  ROLE_DEFINITIONS,
  getNavigationForRole,
} from '@/config/navigation'
import { RoleContext } from './useRole'

const ROLE_STORAGE_KEY = 'sharesphere_active_role'
const COLLAPSE_STORAGE_KEY = 'sharesphere_sidebar_collapsed'

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null
    if (saved && saved in ROLE_DEFINITIONS) {
      return saved
    }
    return 'org_admin'
  })

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY)
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, currentRole)
  }, [currentRole])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const toggleCollapse = () => setIsCollapsed((prev) => !prev)

  const userProfile = MOCK_USER_PROFILES[currentRole]
  const roleMeta = ROLE_DEFINITIONS[currentRole]
  const navItems = getNavigationForRole(currentRole)

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setRole: setCurrentRole,
        userProfile,
        roleMeta,
        navItems,
        isCollapsed,
        setIsCollapsed,
        toggleCollapse,
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}
