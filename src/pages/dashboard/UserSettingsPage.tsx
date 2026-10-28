import { Card } from '@/components/ui'

export function UserSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage your profile, preferences, and account security.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          User settings will be available after authentication is integrated.
        </p>
      </Card>
    </div>
  )
}

