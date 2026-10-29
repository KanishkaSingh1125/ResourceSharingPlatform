import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card } from '@/components/ui'
import { getVerificationHistory, transitionVerificationStatus, updateOrganisation } from '@/features/organisations'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { VerificationDecision } from '@/types'

export function OrgSettingsPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [history, setHistory] = useState<VerificationDecision[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrganisation) return
    setDescription(activeOrganisation.description ?? '')
    setWebsite(activeOrganisation.website ?? '')
    setContactEmail(activeOrganisation.contact_email ?? '')
    setContactPhone(activeOrganisation.contact_phone ?? '')
    setAddress(activeOrganisation.address ?? '')
    let active = true
    setLoadingHistory(true)
    void getVerificationHistory(activeOrganisation.id).then(result => {
      if (!active) return
      setHistory(result.data)
      setError(result.error)
      setLoadingHistory(false)
    }).catch(loadError => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'Could not load verification history.')
      setLoadingHistory(false)
    })
    return () => { active = false }
  }, [activeOrganisation])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to view settings.'}</p>
  }

  const organisation = activeOrganisation
  const canEdit = ['owner', 'admin'].includes(organisation.my_role)
  const canSubmit = canEdit && ['draft', 'additional_information_required'].includes(organisation.verification_status)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await updateOrganisation(organisation.id, {
      description: description.trim(),
      website: website.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      address: address.trim() || null,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice('Organisation profile updated.')
  }

  async function handleSubmitForReview() {
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await transitionVerificationStatus(
      organisation.id,
      'submitted',
      'Submitted by organisation administrator.',
    )
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Could not submit this organisation for review.')
      return
    }
    setNotice('Submitted for verification review. Approval is not automatic.')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-neutral-900">Organisation settings</h1>
      <p className="mt-1 text-sm text-neutral-600">Manage {activeOrganisation.name} and review its actual verification history.</p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-semibold text-neutral-900">Organisation profile</h2>
          <form onSubmit={event => void handleSave(event)} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Description
              <textarea rows={4} maxLength={3000} value={description} disabled={!canEdit}
                onChange={event => setDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Website
              <input type="url" maxLength={500} value={website} disabled={!canEdit}
                onChange={event => setWebsite(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Contact email
              <input type="email" maxLength={320} value={contactEmail} disabled={!canEdit}
                onChange={event => setContactEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Contact phone
              <input type="tel" maxLength={40} value={contactPhone} disabled={!canEdit}
                onChange={event => setContactPhone(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Address
              <input maxLength={500} value={address} disabled={!canEdit}
                onChange={event => setAddress(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50" />
            </label>
            {canEdit && <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>}
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-semibold text-neutral-900">Verification status</h2>
            <p className="mt-3 text-sm text-neutral-700">
              Current status: <span className="font-semibold">{activeOrganisation.verification_status.replaceAll('_', ' ')}</span>
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Resource discovery requires an approved organisation. Submission does not itself verify your organisation.
            </p>
            {canSubmit && (
              <Button type="button" className="mt-4" disabled={saving} onClick={() => void handleSubmitForReview()}>
                Submit for review
              </Button>
            )}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-neutral-900">Verification history</h2>
            {loadingHistory ? <p className="mt-3 text-sm text-neutral-600">Loading history…</p>
              : history.length === 0 ? <p className="mt-3 text-sm text-neutral-600">No verification decisions are visible.</p>
              : (
                <ol className="mt-3 space-y-3">
                  {history.map(decision => (
                    <li key={decision.id} className="border-l-2 border-neutral-200 pl-3">
                      <p className="text-sm font-medium text-neutral-800">
                        {decision.previous_status.replaceAll('_', ' ')} → {decision.new_status.replaceAll('_', ' ')}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDate(decision.decided_at)} · {decision.reason || 'No reason recorded'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
          </Card>
        </div>
      </div>
      <p className="mt-5 text-xs text-neutral-500">
        Verification-document upload is not implemented in the current website. Do not treat this profile editor as proof of organisation verification.
      </p>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
