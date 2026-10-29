import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Pagination, PageHeader } from '@/components/ui'
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService'
import { type AppNotification, type NotificationType } from '@/types/notification'

const PAGE_SIZE = 20
const notificationTypes: Array<{ value: NotificationType; label: string }> = [
  { value: 'booking_request', label: 'Booking requests' },
  { value: 'booking_status', label: 'Booking updates' },
  { value: 'waiting_list', label: 'Waiting list' },
  { value: 'verification', label: 'Verification' },
  { value: 'resource', label: 'Resources' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'condition_report', label: 'Condition reports' },
  { value: 'incident', label: 'Incidents' },
  { value: 'credential_expiry', label: 'Credential expiry' },
  { value: 'sharing_consent', label: 'Sharing consent' },
  { value: 'safety_hold', label: 'Safety holds' },
  { value: 'system', label: 'Other updates' },
]

function isInternalLink(link?: string): link is string {
  return Boolean(link && link.startsWith('/') && !link.startsWith('//'))
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    getUserNotifications({
        page,
        pageSize: PAGE_SIZE,
        read: readFilter === 'all' ? undefined : readFilter === 'read',
        type: typeFilter ? (typeFilter as NotificationType) : undefined,
      })
      .then((result) => {
        if (!active) return
        setNotifications(result.notifications)
        setTotal(result.total)
        setUnreadCount(result.unreadCount)
        setErrorText(null)
      })
      .catch((error) => {
        if (active) {
          setNotifications([])
          setTotal(0)
          setErrorText(error instanceof Error ? error.message : 'Notifications could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [page, readFilter, typeFilter, refreshKey])

  const markRead = async (id: string) => {
    setActionError(null)
    try {
      await markNotificationAsRead(id)
      setLoading(true)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The notification could not be updated.')
    }
  }

  const markAllRead = async () => {
    setActionError(null)
    try {
      await markAllNotificationsAsRead()
      setLoading(true)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Notifications could not be updated.')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates delivered by ShareSphere for your account."
        badge={<Badge variant="primary">{unreadCount} unread</Badge>}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-neutral-700">
              Read status
              <select
                value={readFilter}
                onChange={(event) => {
                  setLoading(true)
                  setErrorText(null)
                  setReadFilter(event.target.value as typeof readFilter)
                  setPage(1)
                }}
                className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <option value="all">All notifications</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-neutral-700">
              Category
              <select
                value={typeFilter}
                onChange={(event) => {
                  setLoading(true)
                  setErrorText(null)
                  setTypeFilter(event.target.value)
                  setPage(1)
                }}
                className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <option value="">All categories</option>
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || loading}
          >
            Mark all as read
          </Button>
        </div>
      </Card>

      {actionError && <Alert variant="error" title="Update failed">{actionError}</Alert>}
      {errorText && <Alert variant="error" title="Notifications unavailable">{errorText}</Alert>}

      {loading ? (
        <Card aria-live="polite"><p className="text-sm text-neutral-600">Loading notifications…</p></Card>
      ) : errorText ? null : notifications.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <h2 className="font-semibold text-neutral-900">No notifications to show</h2>
            <p className="mt-1 text-sm text-neutral-600">
              New updates will appear here when they are recorded for your account.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-neutral-900">{notification.title}</h2>
                    <Badge variant={notification.read ? 'default' : 'primary'}>
                      {notification.read ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{notification.message}</p>
                  <time
                    className="mt-2 block text-xs text-neutral-500"
                    dateTime={notification.createdAt}
                  >
                    {formatTimestamp(notification.createdAt)}
                  </time>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {isInternalLink(notification.link) && (
                    <Link
                      to={notification.link}
                      onClick={() => {
                        if (!notification.read) void markRead(notification.id)
                      }}
                      className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                    >
                      View record
                    </Link>
                  )}
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={() => void markRead(notification.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  )
}
