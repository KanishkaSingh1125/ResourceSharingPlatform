import { useState, type FormEvent } from 'react'
import { User as UserIcon, Mail, Calendar, Shield } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Card, Button } from '@/components/ui'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

export function ProfilePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Keep local state in sync with profile changes
  const currentName = profile?.display_name ?? ''
  if (displayName === '' && currentName && displayName !== currentName) {
    setDisplayName(currentName)
  }

  if (authLoading) {
    return <LoadingSpinner fullPage label="Loading profile…" />
  }

  if (!user) {
    return (
      <Card>
        <p className="text-sm text-neutral-500">Unable to load profile. Please sign in again.</p>
      </Card>
    )
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)

    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty.')
      return
    }
    if (displayName.trim().length < 2) {
      setSaveError('Display name must be at least 2 characters.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user!.id)

    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    setSaveSuccess(true)
    await refreshProfile()
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
      <p className="mt-1 text-sm text-neutral-500">
        View and update your account information.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-neutral-800">Profile Details</h2>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            {saveError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
                Profile updated successfully!
              </div>
            )}

            {/* Display name (editable) */}
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-neutral-700">
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                <Mail className="h-4 w-4 text-neutral-400" />
                {user.email ?? 'No email'}
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Email changes must be done through the account settings flow.
              </p>
            </div>

            {/* Avatar placeholder */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-8 w-8" />
                  )}
                </div>
                <div className="text-sm text-neutral-500">
                  <p>Avatar upload is not yet configured.</p>
                  <p className="text-xs text-neutral-400">
                    A secure Storage bucket is required before enabling uploads.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Card>

        {/* Account info sidebar */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-neutral-800">Account Info</h3>
            <dl className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Status</dt>
                  <dd className="text-sm text-neutral-800">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      {profile?.account_status ?? 'active'}
                    </span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <dt className="text-xs font-medium text-neutral-500">Member since</dt>
                  <dd className="text-sm text-neutral-800">
                    {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
