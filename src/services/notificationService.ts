import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { type AppNotification, type NotificationType } from '@/types/notification'
import { type Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export interface NotificationPage {
  notifications: AppNotification[]
  total: number
  unreadCount: number
}

export interface NotificationQuery {
  page?: number
  pageSize?: number
  read?: boolean
  type?: NotificationType
}

async function requireCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Notifications require a configured backend.')
  }
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Could not verify your session: ${error.message}`)
  if (!data.user) throw new Error('Sign in before accessing notifications.')
  return data.user.id
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    read: row.read,
    link: row.link ?? undefined,
    createdAt: row.created_at,
  }
}

export async function getUserNotifications(
  options: NotificationQuery = {}
): Promise<NotificationPage> {
  const userId = await requireCurrentUserId()
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 20
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Choose a valid notification page.')
  }

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (options.read !== undefined) query = query.eq('read', options.read)
  if (options.type) query = query.eq('type', options.type)

  const start = (page - 1) * pageSize
  const [pageResult, unreadResult] = await Promise.all([
    query.range(start, start + pageSize - 1),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false),
  ])
  if (pageResult.error) throw new Error(`Could not load notifications: ${pageResult.error.message}`)
  if (unreadResult.error) {
    throw new Error(`Could not load the unread notification count: ${unreadResult.error.message}`)
  }

  return {
    notifications: ((pageResult.data || []) as NotificationRow[]).map(toNotification),
    total: pageResult.count ?? 0,
    unreadCount: unreadResult.count ?? 0,
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const userId = await requireCurrentUserId()
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(`Could not mark the notification as read: ${error.message}`)
  if (!data) throw new Error('The notification is unavailable or you do not have permission to change it.')
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const userId = await requireCurrentUserId()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(`Could not mark notifications as read: ${error.message}`)
}
