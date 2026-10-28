import { Card } from '@/components/ui'

export function OrgSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Organisation Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Profile, verification status, and resource-sharing preferences.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Settings will be available once the organisation backend is connected.
        </p>
      </Card>
    </div>
  )
}

