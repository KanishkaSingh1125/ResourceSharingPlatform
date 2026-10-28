import { Send } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/ui'

export function MyRequestsPage() {
  return (
    <div>
      <PageHeader
        title="My Access Requests"
        subtitle="Track resource requests submitted to partner institutions and review approval requirements."
        badge={
          <Badge variant="warning" showDot>
            1 Pending Approval
          </Badge>
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'My Requests' },
        ]}
      />

      <EmptyState
        icon={<Send className="h-6 w-6 text-brand-600" />}
        title="1 Outgoing Request Under Review"
        description="Your request for Class 100 Cleanroom (IIT Delhi) was submitted on Oct 28. The host lab coordinator usually responds within 24-48 business hours."
        actionLabel="Explore More Resources"
        onAction={() => window.location.assign('/dashboard/discover')}
      />
    </div>
  )
}

