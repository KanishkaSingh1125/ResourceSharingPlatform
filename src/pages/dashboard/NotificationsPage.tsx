import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, RefreshCw } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  getMyNotifications,
  markNotificationRead,
  markNotificationUnread,
} from '@/lib/notificationService'
import type { Notification } from '@/types'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getMyNotifications({
      page,
      pageSize: 20,
      is_read: filter === 'all' ? undefined : filter === 'read',
    })
    setNotifications(result.data)
    setCount(result.count)
    setHasMore(result.hasMore)
    setError(result.error)
    setLoading(false)
  }, [filter, page])

  useEffect(() => { void loadNotifications() }, [loadNotifications])

  const visible = notifications

  async function toggleRead(notification: Notification) {
    setPendingId(notification.id)
    setActionError(null)
    const result = notification.is_read
      ? await markNotificationUnread(notification.id)
      : await markNotificationRead(notification.id)
    setPendingId(null)
    if (result.error) {
      setActionError(result.error)
      return
    }
    if (filter === 'all') {
      setNotifications(current => current.map(item =>
        item.id === notification.id ? { ...item, is_read: !notification.is_read } : item,
      ))
    } else {
      setNotifications(current => current.filter(item => item.id !== notification.id))
      setCount(current => Math.max(0, current - 1))
    }
  }

  function getNotificationLink(notification: Notification) {
    if (notification.type === 'booking_created') return '/org/bookings'
    if (notification.type.startsWith('booking_')) return '/dashboard/bookings'
    if (notification.type === 'waitlist_available') return '/dashboard/bookings'
    if (notification.type === 'incident_reported') return '/org/incidents'
    if (notification.type === 'verification_update') return '/org/settings'
    return null
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Persistent updates for your account. You only see notifications addressed to you.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" aria-label="Notification filter">
          {(['all', 'unread', 'read'] as const).map(value => (
            <Button key={value} type="button" size="sm" variant={filter === value ? 'primary' : 'outline'}
              aria-pressed={filter === value} onClick={() => { setPage(1); setFilter(value) }}>
              {value[0].toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadNotifications()} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <div className="mt-2 text-sm text-neutral-500" aria-live="polite">
        {count} {count === 1 ? 'notification' : 'notifications'} total
      </div>
      {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}

      <div className="mt-4 space-y-3" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <Card className="text-sm text-neutral-600">Loading notifications…</Card>
        ) : error ? (
          <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-800">
            <p className="font-semibold">Could not load notifications</p>
            <p className="mt-1 break-words">{error}</p>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="py-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-neutral-300" aria-hidden="true" />
            <p className="mt-3 text-sm text-neutral-600">
              {notifications.length === 0 ? 'You have no notifications yet.' : `No ${filter} notifications on this page.`}
            </p>
          </Card>
        ) : visible.map(notification => {
          const href = getNotificationLink(notification)
          return (
            <Card key={notification.id} className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${notification.is_read ? '' : 'border-brand-200 bg-brand-50/40'}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-neutral-900">{notification.title}</h2>
                  {!notification.is_read && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">Unread</span>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{notification.body}</p>
                <time className="mt-2 block text-xs text-neutral-500" dateTime={notification.created_at}>
                  {formatNotificationTime(notification.created_at)}
                </time>
                {href && (
                  <Link className="mt-2 inline-block text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                    to={href}>Open related {notification.type.startsWith('booking_') ? 'bookings' : 'workspace'}</Link>
                )}
              </div>
              <Button type="button" size="sm" variant="outline" disabled={pendingId === notification.id}
                onClick={() => void toggleRead(notification)}>
                {pendingId === notification.id ? 'Saving…' : notification.is_read ? 'Mark unread' : 'Mark read'}
              </Button>
            </Card>
          )
        })}
      </div>

      {(page > 1 || hasMore) && !error && (
        <div className="mt-5 flex items-center justify-between">
          <Button type="button" variant="outline" disabled={page === 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</Button>
          <span className="text-sm text-neutral-600">Page {page}</span>
          <Button type="button" variant="outline" disabled={!hasMore || loading} onClick={() => setPage(current => current + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
