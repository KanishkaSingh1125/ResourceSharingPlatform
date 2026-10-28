import { Card } from '@/components/ui'

export function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
      <p className="mt-1 text-sm text-neutral-500">
        View and manage platform users across all organisations.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          User management will be available once authentication is integrated.
        </p>
      </Card>
    </div>
  )
}

