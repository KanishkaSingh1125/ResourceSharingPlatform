import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notificationService'
import { type AppNotification } from '@/types/notification'
import { NotificationsPage } from './NotificationsPage'

vi.mock('@/services/notificationService', () => ({
  getUserNotifications: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markNotificationAsRead: vi.fn(),
}))

const persistedNotification: AppNotification = {
  id: 'notice-1',
  userId: 'user-1',
  type: 'booking_status',
  title: 'Booking approved',
  message: 'Your booking was approved.',
  read: false,
  link: '/dashboard/bookings/booking-1',
  createdAt: '2026-10-28T10:00:00.000Z',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>
  )
}

describe('NotificationsPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue()
    vi.mocked(markNotificationAsRead).mockResolvedValue()
  })

  it('renders persisted notifications, timestamps, status, and internal record links', async () => {
    vi.mocked(getUserNotifications).mockResolvedValue({
      notifications: [persistedNotification],
      total: 1,
      unreadCount: 1,
    })

    const { container } = renderPage()

    expect(await screen.findByText('Booking approved')).toBeTruthy()
    expect(screen.getByText('Your booking was approved.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View record' }).getAttribute('href')).toBe(
      '/dashboard/bookings/booking-1'
    )
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(persistedNotification.createdAt)
  })

  it('requests filtered pages from the backend', async () => {
    vi.mocked(getUserNotifications).mockResolvedValue({
      notifications: [],
      total: 0,
      unreadCount: 2,
    })

    renderPage()
    await waitFor(() => expect(getUserNotifications).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      read: undefined,
      type: undefined,
    }))

    fireEvent.change(screen.getByRole('combobox', { name: 'Read status' }), { target: { value: 'unread' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'booking_status' } })

    await waitFor(() => expect(getUserNotifications).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      read: false,
      type: 'booking_status',
    }))
  })

  it('persists read actions and reloads the updated notification', async () => {
    vi.mocked(getUserNotifications)
      .mockResolvedValueOnce({
        notifications: [persistedNotification],
        total: 1,
        unreadCount: 1,
      })
      .mockResolvedValueOnce({
        notifications: [{ ...persistedNotification, read: true }],
        total: 1,
        unreadCount: 0,
      })

    renderPage()
    await screen.findByText('Booking approved')
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))

    await waitFor(() => expect(markNotificationAsRead).toHaveBeenCalledWith('notice-1'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark read' })).toBeNull())
  })

  it('shows backend errors instead of fabricating notifications', async () => {
    vi.mocked(getUserNotifications).mockRejectedValue(new Error('Notifications require a configured backend.'))

    renderPage()

    expect(await screen.findByText('Notifications require a configured backend.')).toBeTruthy()
    expect(screen.queryByText('Booking approved')).toBeNull()
  })
})
