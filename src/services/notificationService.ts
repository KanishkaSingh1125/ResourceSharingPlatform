import { type AppNotification } from '@/types/notification'
import { getCurrentProfile } from './authService'

const STORAGE_KEY_NOTIFICATIONS = 'sharesphere_notifications_v1'

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'usr-turing-01',
    type: 'booking_status',
    title: 'Booking Approved',
    message: 'Your reservation for Cryo-TEM 300kV on Nov 2 has been approved by MIT Nano Core.',
    read: false,
    link: '/dashboard/bookings',
    createdAt: '2026-10-25T14:00:00Z',
  },
  {
    id: 'notif-2',
    userId: 'usr-turing-01',
    type: 'verification',
    title: 'Accreditation Validated',
    message: 'Institutional MOU and safety certification clearance verified through Oct 2027.',
    read: true,
    link: '/org/verification',
    createdAt: '2026-10-20T09:30:00Z',
  },
  {
    id: 'notif-3',
    userId: 'usr-turing-01',
    type: 'booking_request',
    title: 'New Reservation Request',
    message: 'Harvard Innovation Makerspace requested 4 hours on the Lithography Bay.',
    read: false,
    link: '/org/bookings',
    createdAt: '2026-10-27T16:45:00Z',
  },
]

function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS))
      return SEED_NOTIFICATIONS
    }
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load notifications from storage', err)
    return SEED_NOTIFICATIONS
  }
}

function saveStoredNotifications(list: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list))
  } catch (err) {
    console.error('Failed to save notifications to storage', err)
  }
}

export async function getUserNotifications(userId?: string): Promise<AppNotification[]> {
  const profile = await getCurrentProfile()
  const targetId = userId || profile.id
  const list = getStoredNotifications()
  return list.filter((n) => n.userId === targetId)
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  const list = getStoredNotifications()
  const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n))
  saveStoredNotifications(updated)
  return true
}

export async function markAllNotificationsAsRead(userId?: string): Promise<boolean> {
  const profile = await getCurrentProfile()
  const targetId = userId || profile.id
  const list = getStoredNotifications()
  const updated = list.map((n) => (n.userId === targetId ? { ...n, read: true } : n))
  saveStoredNotifications(updated)
  return true
}

export async function createNotification(
  input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<AppNotification> {
  const list = getStoredNotifications()
  const newNotif: AppNotification = {
    ...input,
    id: `notif-${Date.now()}`,
    read: false,
    createdAt: new Date().toISOString(),
  }
  saveStoredNotifications([newNotif, ...list])
  return newNotif
}

