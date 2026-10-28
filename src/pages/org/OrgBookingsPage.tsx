import { Card } from '@/components/ui'

export function OrgBookingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Booking Requests</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Review, approve, or decline incoming booking requests.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Booking request management will be available once the backend is connected.
        </p>
      </Card>
    </div>
  )
}

