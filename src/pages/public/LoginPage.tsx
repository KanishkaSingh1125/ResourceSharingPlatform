import { Card } from '@/components/ui'

export function LoginPage() {
  return (
    <section className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-center text-2xl font-bold text-neutral-900">Sign in</h1>
      <p className="mt-2 text-center text-sm text-neutral-600">
        Access your dashboard, bookings, and organisation workspace.
      </p>

      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Authentication will be powered by Supabase Auth.
          This page is a placeholder.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              disabled
              placeholder="you@example.com"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Sign in (coming soon)
          </button>
        </div>
      </Card>
    </section>
  )
}

