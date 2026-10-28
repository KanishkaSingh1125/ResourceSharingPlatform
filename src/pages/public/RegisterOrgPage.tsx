import { Card } from '@/components/ui'

export function RegisterOrgPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-neutral-900">Register Organisation</h1>
      <p className="mt-2 text-neutral-600">
        Get your college, lab, makerspace, or company verified to list and share resources.
      </p>

      <Card className="mt-8">
        <p className="text-sm text-neutral-500">
          Organisation registration involves admin verification. This form is a placeholder
          until the backend and approval flow are implemented.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Organisation name
            </label>
            <input
              type="text"
              disabled
              placeholder="Acme University"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Organisation type
            </label>
            <select
              disabled
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            >
              <option>Select type…</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Contact email
            </label>
            <input
              type="email"
              disabled
              placeholder="admin@organisation.edu"
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
          >
            Submit for Verification (coming soon)
          </button>
        </div>
      </Card>
    </section>
  )
}

