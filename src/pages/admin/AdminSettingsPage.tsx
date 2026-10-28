import { Card } from '@/components/ui'

export function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Platform Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Global configuration, policies, and platform parameters.
      </p>
      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Admin settings will be available once the backend is connected.
        </p>
      </Card>
    </div>
  )
}

