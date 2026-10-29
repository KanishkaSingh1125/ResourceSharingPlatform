export type NotificationType =
  | 'booking_request'
  | 'booking_status'
  | 'waiting_list'
  | 'verification'
  | 'resource'
  | 'maintenance'
  | 'condition_report'
  | 'incident'
  | 'credential_expiry'
  | 'sharing_consent'
  | 'safety_hold'
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
