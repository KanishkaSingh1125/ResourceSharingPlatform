import { Card } from '@/components/ui'

export function MyBookingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">My Bookings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Track your upcoming, active, and past bookings.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Booking history will appear here once the booking system is implemented.
        </p>
      </Card>
    </div>
  )
}

