import { type Profile, type ProfileUpdateInput, type UserCredential } from '@/types/profile'
import { type UserRole } from '@/types/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const USER_ROLES: UserRole[] = ['member', 'manager', 'org_admin', 'platform_admin']

function parseRole(value: unknown): UserRole {
  if (typeof value !== 'string' || !USER_ROLES.includes(value as UserRole)) {
    throw new Error('Your account role could not be verified.')
  }
  return value as UserRole
}

export async function getCurrentProfile(): Promise<Profile> {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication requires a configured Supabase backend.')
  }

  const { data: authUser, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('Could not verify the current Supabase session.', authError)
    throw new Error('Your session could not be verified. Sign in again.')
  }
  if (!authUser.user) throw new Error('Sign in before accessing your profile.')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.user.id)
    .maybeSingle()
  if (error) {
    console.error('Could not load the authenticated profile.', error)
    throw new Error('Your account profile could not be loaded.')
  }
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
    role: parseRole(profileRow.role),
    credentials: [],
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Sign out is unavailable because authentication is not configured.')
  }
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Supabase sign out failed.', error)
    throw new Error('Sign out failed. Please try again.')
  }
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Profiles require a configured Supabase backend.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('Could not load a profile record.', error)
    throw new Error('The requested profile could not be loaded.')
  }
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
    role: parseRole(profileRow.role),
    credentials: [],
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  }
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
  if (!isSupabaseConfigured) {
    throw new Error('Profile updates require a configured Supabase backend.')
  }

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
  if (error) {
    console.error('Could not save the profile.', error)
    throw new Error('Your profile could not be saved.')
  }
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
    role: parseRole(profileRow.role),
    credentials: [],
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  }
}

export async function getUserCredentials(userId: string): Promise<UserCredential[]> {
  const profile = await getProfileById(userId)
  return profile?.credentials ?? []
}
