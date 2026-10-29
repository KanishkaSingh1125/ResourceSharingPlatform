import { describe, expect, it } from 'vitest'
import { getCurrentProfile, getProfileById, updateProfile } from './authService'

describe('authService without Supabase configuration', () => {
  it('does not authenticate a seeded local profile', async () => {
    await expect(getCurrentProfile()).rejects.toThrow(
      'Authentication requires a configured Supabase backend.'
    )
  })

  it('does not return seeded profiles for arbitrary identifiers', async () => {
    await expect(getProfileById('demo-user-id')).rejects.toThrow(
      'Profiles require a configured Supabase backend.'
    )
  })

  it('does not persist profile edits in local browser storage', async () => {
    await expect(updateProfile('demo-user-id', { fullName: 'Changed name' })).rejects.toThrow(
      'Profile updates require a configured Supabase backend.'
    )
  })
})
