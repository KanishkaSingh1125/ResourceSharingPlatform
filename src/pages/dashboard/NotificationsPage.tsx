import { Card } from '@/components/ui'

export function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Booking approvals, reminders, and system updates.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Notifications will be powered by Supabase real-time subscriptions.
        </p>
      </Card>
    </div>
  )
}

