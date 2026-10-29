import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Building2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useAuth } from '@/lib/AuthContext'
import { createOrganisation, transitionVerificationStatus } from '@/features/organisations'
import { slugify } from '@/lib/utils'

export function RegisterOrgPage() {
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const slug = slugify(name)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    if (!slug) {
      setError('Enter an organisation name containing letters or numbers.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    const created = await createOrganisation({
      name: name.trim(),
      slug,
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      address: address.trim() || undefined,
    })
    if (created.error || !created.data) {
      setSubmitting(false)
      setError(created.error ?? 'Could not create the organisation.')
      return
    }
    const submitted = await transitionVerificationStatus(created.data.id, 'submitted', 'Organisation registration submitted for review.')
    setSubmitting(false)
    if (!submitted.success) {
      setNotice(`Organisation created as a draft. It was not submitted: ${submitted.error ?? 'submission failed'}`)
      return
    }
    setNotice(`Registration submitted for review. The organisation is not approved until a platform reviewer completes verification.`)
    setName('')
    setDescription('')
    setWebsite('')
    setContactEmail('')
    setContactPhone('')
    setAddress('')
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-brand-600" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Register Organisation</h1>
          <p className="mt-1 text-sm text-neutral-600">Create a workspace and submit it for platform review.</p>
        </div>
      </div>
      {!authLoading && !user ? (
        <Card className="mt-8">
          <p className="text-sm text-neutral-700">Sign in before registering an organisation.</p>
          <Link to="/login?redirect=%2Fregister-org" className="mt-4 inline-flex"><Button>Sign in</Button></Link>
        </Card>
      ) : (
        <Card className="mt-8">
          {error && <div role="alert" className="mb-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
          {notice && <div role="status" className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}<p className="mt-2"><Link className="font-medium underline" to="/org">Open organisation workspace</Link></p></div>}
          <p className="text-sm text-neutral-600">
            Registration does not verify the organisation or publish resources. A trusted platform reviewer must review the submission.
          </p>
          <form onSubmit={event => void handleSubmit(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-neutral-700 sm:col-span-2">
              Organisation name
              <input required minLength={2} maxLength={160} value={name} onChange={event => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <div className="sm:col-span-2">
              <p className="text-xs text-neutral-500">Workspace URL slug: {slug || 'enter a name'}</p>
            </div>
            <label className="text-sm font-medium text-neutral-700 sm:col-span-2">
              Description
              <textarea rows={3} maxLength={3000} value={description} onChange={event => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Website
              <input type="url" maxLength={500} value={website} onChange={event => setWebsite(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Contact email
              <input type="email" maxLength={320} value={contactEmail} onChange={event => setContactEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Contact phone
              <input type="tel" maxLength={40} value={contactPhone} onChange={event => setContactPhone(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Address
              <input maxLength={500} value={address} onChange={event => setAddress(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!user || submitting || !slug}>
                {submitting ? 'Submitting…' : 'Create and submit for review'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  )
}
