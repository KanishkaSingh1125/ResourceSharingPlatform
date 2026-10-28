export type NotificationType =
  | 'booking_request'
  | 'booking_status'
  | 'verification'
  | 'incident'
  | 'system'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

