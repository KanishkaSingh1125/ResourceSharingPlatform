import { type Profile, type ProfileUpdateInput, type UserCredential } from '@/types/profile'
import { type UserRole } from '@/types/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const STORAGE_KEY_PROFILE = 'sharesphere_active_profile_v1'

const SEED_CREDENTIALS: UserCredential[] = [
  {
    id: 'cred-1',
    userId: 'usr-turing-01',
    name: 'Laser Safety Specialist (ANSI Z136)',
    issuingBody: 'Board of Laser Safety Standards',
    issuedAt: '2025-04-10T00:00:00Z',
    expiresAt: '2027-04-10T00:00:00Z',
    verificationStatus: 'verified',
  },
  {
    id: 'cred-2',
    userId: 'usr-turing-01',
    name: 'ISO Class 5 Cleanroom Gowning & Safety Protocol',
    issuingBody: 'Inter-University Microelectronics Consortium',
    issuedAt: '2025-08-15T00:00:00Z',
    expiresAt: '2027-08-15T00:00:00Z',
    verificationStatus: 'verified',
  },
  {
    id: 'cred-3',
    userId: 'usr-turing-01',
    name: 'BSL-2 Biosafety Containment Clearance',
    issuingBody: 'Institutional Biosafety Committee',
    issuedAt: '2026-01-20T00:00:00Z',
    expiresAt: '2028-01-20T00:00:00Z',
    verificationStatus: 'verified',
  },
]

export const SEED_PROFILE: Profile = {
  id: 'usr-turing-01',
  email: 'turing@mit.edu',
  fullName: 'Prof. Alan Turing',
  avatarUrl: undefined,
  phone: '+1 (617) 253-9081',
  title: 'Director of Laboratory Operations',
  department: 'School of Science & Engineering',
  organisationId: 'org-mit-nanotech-01',
  organisationName: 'MIT Nanotech Core Lab',
  role: 'org_admin',
  credentials: SEED_CREDENTIALS,
  createdAt: '2026-09-12T08:20:00Z',
  updatedAt: '2026-09-15T14:20:00Z',
}

function getStoredProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(SEED_PROFILE))
      return SEED_PROFILE
    }
    return JSON.parse(raw) as Profile
  } catch (err) {
    console.error('Failed to load profile from storage', err)
    return SEED_PROFILE
  }
}

function saveStoredProfile(profile: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile))
  } catch (err) {
    console.error('Failed to save profile to storage', err)
  }
}

export async function getCurrentProfile(): Promise<Profile> {
  if (isSupabaseConfigured) {
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    if (authError) throw new Error(`Could not verify your session: ${authError.message}`)
    if (!authUser.user) throw new Error('Sign in before accessing your profile.')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .maybeSingle()
    if (error) throw new Error(`Could not load your profile: ${error.message}`)
    if (!data) throw new Error('Your authenticated account does not have a ShareSphere profile.')

    const profileRow = data as any
    return {
      id: profileRow.id,
      email: profileRow.email,
      fullName: profileRow.full_name,
      avatarUrl: profileRow.avatar_url ?? undefined,
      phone: profileRow.phone ?? undefined,
      title: profileRow.title ?? undefined,
      department: profileRow.department ?? undefined,
      organisationId: profileRow.organisation_id,
      organisationName: 'Connected Institution',
      role: (profileRow.role as UserRole) || 'member',
      credentials: [],
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    }
  }

  return getStoredProfile()
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(`Could not load the profile: ${error.message}`)
    if (!data) return null

    const profileRow = data as any
    return {
      id: profileRow.id,
      email: profileRow.email,
      fullName: profileRow.full_name,
      avatarUrl: profileRow.avatar_url ?? undefined,
      phone: profileRow.phone ?? undefined,
      title: profileRow.title ?? undefined,
      department: profileRow.department ?? undefined,
      organisationId: profileRow.organisation_id,
      organisationName: 'Member Institution',
      role: (profileRow.role as UserRole) || 'member',
      credentials: [],
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    }
  }

  const profile = getStoredProfile()
  if (profile.id === userId) return profile
  return null
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: input.fullName,
        phone: input.phone,
        title: input.title,
        department: input.department,
        avatar_url: input.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(`Could not save your profile: ${error.message}`)
    if (!data) throw new Error('Your profile was not updated.')

    const profileRow = data as any
    return {
      id: profileRow.id,
      email: profileRow.email,
      fullName: profileRow.full_name,
      avatarUrl: profileRow.avatar_url ?? undefined,
      phone: profileRow.phone ?? undefined,
      title: profileRow.title ?? undefined,
      department: profileRow.department ?? undefined,
      organisationId: profileRow.organisation_id,
      organisationName: 'Connected Institution',
      role: (profileRow.role as UserRole) || 'member',
      credentials: [],
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    }
  }

  const profile = getStoredProfile()
  const updated: Profile = {
    ...profile,
    fullName: input.fullName ?? profile.fullName,
    phone: input.phone ?? profile.phone,
    title: input.title ?? profile.title,
    department: input.department ?? profile.department,
    avatarUrl: input.avatarUrl ?? profile.avatarUrl,
    updatedAt: new Date().toISOString(),
  }

  saveStoredProfile(updated)
  return updated
}

export async function getUserCredentials(userId: string): Promise<UserCredential[]> {
  const profile = await getProfileById(userId)
  return profile?.credentials ?? []
}
