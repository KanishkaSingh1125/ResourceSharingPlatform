import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import { PageHeader, Badge, Card, CardHeader, CardContent } from '@/components/ui'

export function OrgVerificationPage() {
  return (
    <div>
      <PageHeader
        title="Organisation Verification"
        subtitle="Institutional accreditation status, inter-college agreements, and trust clearance level."
        badge={
          <Badge variant="success" showDot size="md">
            Verified Tier 1 Institution
          </Badge>
        }
        breadcrumbs={[
          { label: 'Workspace', to: '/org' },
          { label: 'Verification Status' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Accreditation Certificate" />
          <CardContent className="space-y-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">MOU verified through Oct 2027</span>
            </div>
            <p>
              Your organisation is cleared to share high-precision instrumentation,
              cleanroom slots, and compute clusters with peer institutions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Trust & Security Standard" />
          <CardContent className="space-y-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2 text-brand-700 bg-brand-50 border border-brand-200 rounded-lg p-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="font-semibold">Row Level Security (RLS) Active</span>
            </div>
            <p>
              Data access, booking logs, and identity attributes are strictly isolated
              within PostgreSQL Row Level Security boundaries.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

