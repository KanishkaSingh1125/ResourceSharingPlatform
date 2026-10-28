import { Eye } from 'lucide-react'
import { PageHeader, Badge, Card, StatCard } from '@/components/ui'

export function AdminMonitoringPage() {
  return (
    <div>
      <PageHeader
        title="Resource Monitoring"
        subtitle="Real-time telemetry and status monitoring of shared instruments, cleanrooms, and high-performance clusters."
        badge={<Badge variant="success">99.4% Platform Uptime</Badge>}
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Resource Monitoring' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Monitored Instruments"
          value="248"
          icon={<Eye className="h-5 w-5" />}
          iconColor="brand"
        />
        <StatCard
          title="Telemetry Heartbeats"
          value="Normal"
          icon={<Eye className="h-5 w-5" />}
          iconColor="success"
        />
        <StatCard
          title="Scheduled Offline"
          value="4"
          icon={<Eye className="h-5 w-5" />}
          iconColor="warning"
        />
      </div>

      <Card>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Automated ping probes and IoT check-in scanners stream operational heartbeats
          here to detect hardware outages before reservation windows begin.
        </p>
      </Card>
    </div>
  )
}

