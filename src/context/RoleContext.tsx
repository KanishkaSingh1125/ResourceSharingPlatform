import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { type Profile } from '@/types/profile'
import { type UserRole, type UserProfile } from '@/types/navigation'
import { ROLE_DEFINITIONS, getNavigationForRole } from '@/config/navigation'
import { getCurrentProfile } from '@/services/authService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { RoleContext } from './useRole'

const COLLAPSE_STORAGE_KEY = 'sharesphere_sidebar_collapsed'

const signedOutProfile: UserProfile = {
  name: 'Signed out',
  email: '',
  role: 'member',
  roleLabel: ROLE_DEFINITIONS.member.label,
  organisation: 'No organisation',
  orgType: 'Not available',
}

function isUserRole(value: string): value is UserRole {
  return value in ROLE_DEFINITIONS
}

function toUserProfile(profile: Profile): UserProfile {
  return {
    name: profile.fullName,
    email: profile.email,
    role: profile.role,
    roleLabel: ROLE_DEFINITIONS[profile.role].label,
    organisation: profile.organisationName,
    orgType: 'Organisation',
    avatarUrl: profile.avatarUrl,
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true'
    } catch (error) {
      console.error('Could not read sidebar preference.', error)
      return false
    }
  })

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProfile(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      setAuthError(null)
      return
    }

    setIsLoading(true)
    setAuthError(null)
    try {
      const currentProfile = await getCurrentProfile()
      if (!isUserRole(currentProfile.role)) {
        throw new Error('Your account has an unsupported role. Contact an administrator.')
      }
      setProfile(currentProfile)
      setIsAuthenticated(true)
    } catch (error) {
      setProfile(null)
      setIsAuthenticated(false)
      setAuthError(error instanceof Error ? error.message : 'Your account could not be verified.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    void Promise.resolve().then(refreshProfile)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        setAuthError(null)
        return
      }
      queueMicrotask(() => { void refreshProfile() })
    })
    return () => subscription.unsubscribe()
  }, [refreshProfile])

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(isCollapsed))
    } catch (error) {
      console.error('Could not save sidebar preference.', error)
    }
  }, [isCollapsed])

  const currentRole = profile?.role ?? 'member'
  const userProfile = profile ? toUserProfile(profile) : signedOutProfile
  const roleMeta = ROLE_DEFINITIONS[currentRole]
  const navItems = getNavigationForRole(currentRole)
  const toggleCollapse = () => setIsCollapsed((previous) => !previous)

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        userProfile,
        isAuthenticated,
        isLoading,
        authError,
        refreshProfile,
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
