/**
 * lib/notificationService.ts
 *
 * Small wrapper around the Supabase "notifications" table.
 * Provides helpers for creating, marking read, and fetching user notifications.
 */

import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

/** Create a notification for a specific user */
export async function createNotification(params: {
  user_id: string
  type: Notification['type']
  title: string
  body: string
  metadata?: Record<string, unknown>
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body,
      metadata: params.metadata ?? {},
      is_read: false,
    })
    .single()

  return { data: data as Notification | null, error: error?.message ?? null }
}

/** Mark a notification as read */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .single()

  return { data: data as Notification | null, error: error?.message ?? null }
}

/** Fetch recent notifications for the current authenticated user */
export async function getMyNotifications(opts: { limit?: number } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const limit = opts.limit ?? 20

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: (data ?? []) as Notification[], error: error?.message ?? null }
}
