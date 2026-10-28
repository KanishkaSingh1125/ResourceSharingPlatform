import { Card } from '@/components/ui'

export function OrgMembersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Members</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage organisation members, roles, and invitations.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Member management will be available once authentication and roles are implemented.
        </p>
      </Card>
    </div>
  )
}

