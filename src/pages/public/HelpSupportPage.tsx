import { Mail, BookOpen, ShieldCheck } from 'lucide-react'
import { PageHeader, Card, CardHeader, CardContent, Button } from '@/components/ui'

export function HelpSupportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Help & Support"
        subtitle="Guides, institutional protocols, and assistance for ShareSphere resource sharing."
        breadcrumbs={[
          { label: 'Public', to: '/' },
          { label: 'Help & Support' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader
            title="Resource Booking Guide"
            subtitle="How to request access, submit qualifications, and check-in via QR code."
          />
          <CardContent>
            <Button variant="outline" size="sm" leftIcon={<BookOpen className="h-4 w-4" />}>
              Read Guide
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Institutional Verification"
            subtitle="Guidelines for university departments, makerspaces, and research centers."
          />
          <CardContent>
            <Button variant="outline" size="sm" leftIcon={<ShieldCheck className="h-4 w-4" />}>
              Verification FAQ
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Contact Support"
            subtitle="Direct communication channel with platform technical custodians."
          />
          <CardContent>
            <Button variant="primary" size="sm" leftIcon={<Mail className="h-4 w-4" />}>
              Open Ticket
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Frequently Asked Questions" />
        <CardContent className="space-y-4 text-xs text-neutral-600">
          <div>
            <h4 className="font-semibold text-neutral-900 text-sm">
              How does role-based access control work?
            </h4>
            <p className="mt-1 leading-relaxed">
              ShareSphere uses granular role permissions (Organisation Member, Resource Manager,
              Organisation Administrator, and Platform Administrator). Navigation items and dashboard actions
              are dynamically adapted to your active clearance level. All queries are backed by Row Level Security in PostgreSQL.
            </p>
          </div>
          <div className="border-t border-neutral-100 pt-3">
            <h4 className="font-semibold text-neutral-900 text-sm">
              Can I test other roles during evaluation?
            </h4>
            <p className="mt-1 leading-relaxed">
              Yes! Click your avatar in the sidebar or top header to open the User Profile menu, where the built-in Role Switcher allows instant testing of Member, Manager, Org Admin, and Platform Admin experiences.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
