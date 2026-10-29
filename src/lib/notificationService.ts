/**
 * lib/notificationService.ts
 *
 * Small wrapper around the Supabase "notifications" table.
 * Provides helpers for creating, marking read, and fetching user notifications.
 */

import { supabase } from '@/lib/supabase'
import type { Notification, NotificationPreferences, NotificationType } from '@/types'

const DEFAULT_NOTIFICATION_TYPES: NotificationType[] = [
  'booking_created', 'booking_confirmed', 'booking_rejected', 'booking_cancelled',
  'booking_reminder', 'verification_update', 'membership_invite', 'incident_reported',
  'incident_resolved', 'waitlist_available', 'general',
]

export const NOTIFICATIONS_UPDATED_EVENT = 'sharesphere:notifications-updated'

/** Create a notification for a specific user */
export async function createNotification(params: {
  user_id: string
  type: Notification['type']
  title: string
  body: string
  metadata?: Record<string, unknown>
}) {
  void params
  return {
    data: null as Notification | null,
    error: 'Notifications are created by authorised backend workflows.',
  }
}

/** Mark a notification as read */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select('*')
    .single()

  if (!error) window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
  return { data: data as Notification | null, error: error?.message ?? null }
}

export async function markNotificationUnread(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: false })
    .eq('id', notificationId)
    .select('*')
    .single()

  if (!error) window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
  return { data: data as Notification | null, error: error?.message ?? null }
}

/** Fetch recent notifications for the current authenticated user */
export async function getMyNotifications(opts: {
  limit?: number
  page?: number
  pageSize?: number
  is_read?: boolean
} = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  const page = Math.max(1, Math.floor(opts.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize ?? opts.limit ?? 20)))
  if (!user) return { data: [], count: 0, page, pageSize, hasMore: false, error: 'Not authenticated' }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (typeof opts.is_read === 'boolean') query = query.eq('is_read', opts.is_read)
  const { data, count, error } = await query.range(from, to)

  const totalCount = error ? 0 : (count ?? 0)
  return {
    data: (data ?? []) as Notification[],
    count: totalCount,
    page,
    pageSize,
    hasMore: !error && totalCount > page * pageSize,
    error: error?.message ?? null,
  }
}

export async function getMyUnreadNotificationCount() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { count: null, error: authError?.message ?? 'Not authenticated' }
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  return { count: error ? null : count ?? 0, error: error?.message ?? null }
}

export async function getMyNotificationPreferences() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      data: null,
      enabled_types: DEFAULT_NOTIFICATION_TYPES,
      error: authError?.message ?? 'Not authenticated',
    }
  }
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return { data: null, enabled_types: DEFAULT_NOTIFICATION_TYPES, error: error.message }
  const preferences = data as NotificationPreferences | null
  return { data: preferences, enabled_types: preferences?.enabled_types ?? DEFAULT_NOTIFICATION_TYPES, error: null }
}

export async function updateMyNotificationPreferences(enabledTypes: NotificationType[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: user.id, enabled_types: enabledTypes }, { onConflict: 'user_id' })
    .select('*')
    .single()
  return { data: data as NotificationPreferences | null, error: error?.message ?? null }
}
