import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService'
import { type AppNotification } from '@/types/notification'

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function isInternalLink(link?: string): link is string {
  return Boolean(link && link.startsWith('/') && !link.startsWith('//'))
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    getUserNotifications({ page: 1, pageSize: 5 })
      .then((result) => {
        if (!active) return
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
        setErrorText(null)
      })
      .catch((error) => {
        if (active) {
          setNotifications([])
          setErrorText(error instanceof Error ? error.message : 'Notifications could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [isOpen, refreshKey])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = async () => {
    setActionError(null)
    try {
      await markAllNotificationsAsRead()
      setLoading(true)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Notifications could not be updated.')
    }
  }

  const markRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setLoading(true)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The notification could not be updated.')
    }
  }

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          if (!isOpen) setLoading(true)
          setIsOpen(!isOpen)
        }}
        className="relative rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        aria-label={unreadCount ? `View notifications, ${unreadCount} unread` : 'View notifications'}
        aria-expanded={isOpen}
        aria-controls="notification-dropdown"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white p-2 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-900">
              Notifications ({unreadCount} unread)
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {actionError && <p role="alert" className="px-3 py-2 text-xs text-red-700">{actionError}</p>}
          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100" aria-live="polite">
            {loading ? (
              <p className="p-3 text-xs text-neutral-600">Loading notifications…</p>
            ) : errorText ? (
              <p role="alert" className="p-3 text-xs text-red-700">{errorText}</p>
            ) : notifications.length === 0 ? (
              <p className="p-3 text-xs text-neutral-600">No notifications have been recorded.</p>
            ) : notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg p-2.5 transition-colors ${notification.read ? 'hover:bg-neutral-50' : 'bg-brand-50/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-snug text-neutral-800">{notification.title}</p>
                  {!notification.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{notification.message}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <time className="flex items-center gap-1 text-[10px] text-neutral-500" dateTime={notification.createdAt}>
                    <Clock className="h-3 w-3" />
                    {formatTime(notification.createdAt)}
                  </time>
                  {isInternalLink(notification.link) && (
                    <Link
                      to={notification.link}
                      onClick={() => {
                        if (!notification.read) void markRead(notification.id)
                        setIsOpen(false)
                      }}
                      className="text-[11px] font-medium text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-100 p-1 text-center">
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block rounded py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
