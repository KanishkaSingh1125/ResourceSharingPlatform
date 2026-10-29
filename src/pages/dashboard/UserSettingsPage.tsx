import { useEffect, useState } from 'react'
import { Card, Button } from '@/components/ui'
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from '@/lib/notificationService'
import type { NotificationType } from '@/types'

const notificationTypes: { value: NotificationType; label: string }[] = [
  { value: 'booking_created', label: 'New booking requests' },
  { value: 'booking_confirmed', label: 'Booking confirmations' },
  { value: 'booking_rejected', label: 'Booking rejections' },
  { value: 'booking_cancelled', label: 'Booking cancellations' },
  { value: 'booking_reminder', label: 'Booking reminders' },
  { value: 'verification_update', label: 'Organisation verification updates' },
  { value: 'membership_invite', label: 'Membership invitations' },
  { value: 'incident_reported', label: 'Incident reports' },
  { value: 'incident_resolved', label: 'Incident updates' },
  { value: 'waitlist_available', label: 'Waitlist offers' },
  { value: 'general', label: 'General updates' },
]

export function UserSettingsPage() {
  const [enabledTypes, setEnabledTypes] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    void getMyNotificationPreferences().then(result => {
      if (!active) return
      setEnabledTypes(result.enabled_types)
      setError(result.error)
      setPreferencesLoaded(!result.error)
      setLoading(false)
    }).catch(loadError => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'Could not load preferences.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  function toggleType(type: NotificationType) {
    setEnabledTypes(current => current.includes(type)
      ? current.filter(value => value !== type)
      : [...current, type])
    setSuccess(false)
  }

  async function savePreferences() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updateMyNotificationPreferences(enabledTypes)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Choose which supported notifications are delivered to your account.
      </p>
      <Card className="mt-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-neutral-900">Notification preferences</h2>
        <p className="mt-1 text-sm text-neutral-600">
          These preferences affect notification creation; they do not change booking, safety, or security records.
        </p>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">Preferences saved.</p>}
        {loading ? (
          <p className="mt-5 text-sm text-neutral-600">Loading preferences…</p>
        ) : (
          <>
            <fieldset disabled={saving || !preferencesLoaded} className="mt-5 space-y-3">
              <legend className="sr-only">Notification types</legend>
              {notificationTypes.map(({ value, label }) => (
                <label key={value} className="flex items-start gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={enabledTypes.includes(value)}
                    onChange={() => toggleType(value)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus-visible:ring-brand-500"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <Button type="button" className="mt-6" disabled={saving || !preferencesLoaded} onClick={() => void savePreferences()}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
