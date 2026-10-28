import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Clock } from 'lucide-react'

export interface NotificationItem {
  id: string
  title: string
  time: string
  read: boolean
  type: 'booking' | 'verification' | 'system'
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Booking request for 3D Bioprinter approved',
    time: '10m ago',
    read: false,
    type: 'booking',
  },
  {
    id: '2',
    title: 'Organisation verification verified by Admin',
    time: '2h ago',
    read: false,
    type: 'verification',
  },
  {
    id: '3',
    title: 'Cleanroom slot scheduled for tomorrow at 10:00 AM',
    time: '1d ago',
    read: true,
    type: 'system',
  },
]

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-900">
              Notifications ({unreadCount} new)
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 divide-y divide-neutral-50 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex flex-col gap-1 p-2.5 rounded-lg transition-colors ${
                  !n.read ? 'bg-brand-50/40' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-neutral-800 leading-snug">
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 mt-1" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                  <Clock className="h-3 w-3" />
                  <span>{n.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-100 p-1 text-center">
            <span className="block py-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer">
              View all notifications
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

