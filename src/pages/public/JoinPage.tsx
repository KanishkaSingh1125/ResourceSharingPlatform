import { Card } from '@/components/ui'

export function JoinPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">Join as an Individual</h1>
      <p className="mt-2 text-neutral-600">
        Create your account to discover, request, and book shared resources.
      </p>

      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Individual registration will use Supabase Auth. This form is a placeholder
          until the authentication flow is implemented.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Full name
            </label>
            <input
              type="text"
              disabled
              placeholder="Your full name"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Email address
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
            Create Account (coming soon)
          </button>
        </div>
      </Card>
    </section>
  )
}

