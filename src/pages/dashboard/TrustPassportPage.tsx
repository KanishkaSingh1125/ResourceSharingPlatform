import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  addCredential,
  getCredentialShareConsentHistory,
  getMyCredentialShareConsents,
  getMyCredentials,
  grantCredentialShareConsent,
  revokeCredentialShareConsent,
} from '@/features/eligibility'
import { listOrganisations } from '@/features/organisations'
import type {
  CredentialShareAttribute,
  CredentialShareConsent,
  CredentialShareConsentHistory,
  Organisation,
  UserCredential,
} from '@/types'

const shareAttributes: { value: CredentialShareAttribute; label: string }[] = [
  { value: 'credential_type', label: 'Credential type (required)' },
  { value: 'credential_name', label: 'Credential name' },
  { value: 'issued_at', label: 'Issue date' },
  { value: 'expires_at', label: 'Expiry date' },
  { value: 'verified', label: 'Verification status' },
]

interface ConsentWithHistory extends CredentialShareConsent {
  history: CredentialShareConsentHistory[]
}

export function TrustPassportPage() {
  const [credentials, setCredentials] = useState<UserCredential[]>([])
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [consents, setConsents] = useState<ConsentWithHistory[]>([])
  const [credentialType, setCredentialType] = useState('')
  const [credentialName, setCredentialName] = useState('')
  const [issuedAt, setIssuedAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [consentExpiry, setConsentExpiry] = useState('')
  const [attributes, setAttributes] = useState<CredentialShareAttribute[]>(['credential_type'])
  const [revokeReason, setRevokeReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [credentialResult, consentResult, organisationResult] = await Promise.all([
        getMyCredentials(),
        getMyCredentialShareConsents(),
        listOrganisations({ status: 'approved', page: 1, pageSize: 100 }),
      ])
      const failures = [
        credentialResult.error,
        consentResult.error,
        organisationResult.error,
      ].filter((message): message is string => Boolean(message))
      if (failures.length) {
        setError(failures.join(' '))
        setLoading(false)
        return
      }
      const currentConsents = consentResult.data
      const histories = await Promise.all(currentConsents.map(consent =>
        getCredentialShareConsentHistory(consent.id),
      ))
      const historyError = histories.find(result => result.error)?.error
      if (historyError) {
        setError(historyError)
        setLoading(false)
        return
      }
      setCredentials(credentialResult.data)
      setOrganisations(organisationResult.data)
      setConsents(currentConsents.map((consent, index) => ({
        ...consent,
        history: histories[index].data,
      })))
      if (!recipientId && organisationResult.data[0]) setRecipientId(organisationResult.data[0].id)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your Trust Passport.')
    }
    setLoading(false)
  }, [recipientId])

  useEffect(() => { void load() }, [load])

  const selectedOrganisation = organisations.find(org => org.id === recipientId)
  const selectedCredentials = useMemo(() => credentials.filter(credential =>
    attributes.some(attribute => {
      if (attribute === 'credential_type') return true
      if (attribute === 'credential_name') return Boolean(credential.credential_name)
      if (attribute === 'issued_at') return Boolean(credential.issued_at)
      if (attribute === 'expires_at') return Boolean(credential.expires_at)
      return true
    }),
  ), [attributes, credentials])

  async function handleAddCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await addCredential({
      credential_type: credentialType.trim(),
      credential_name: credentialName.trim(),
      issued_at: issuedAt || undefined,
      expires_at: expiresAt || undefined,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setCredentialType('')
    setCredentialName('')
    setIssuedAt('')
    setExpiresAt('')
    setNotice('Credential saved as self-declared. It will not be treated as verified until an authorised review occurs.')
    await load()
  }

  async function handleGrantConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    const expiry = new Date(`${consentExpiry}T23:59:59.000Z`)
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      setSaving(false)
      setError('Choose a future consent expiry date.')
      return
    }
    const result = await grantCredentialShareConsent({
      recipient_org_id: recipientId,
      purpose: purpose.trim(),
      allowed_attributes: attributes,
      expires_at: expiry.toISOString(),
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Could not grant credential-sharing consent.')
      return
    }
    setPurpose('')
    setConsentExpiry('')
    setNotice(`Consent granted to ${selectedOrganisation?.name ?? 'the selected organisation'}.`)
    await load()
  }

  async function handleRevoke(consentId: string) {
    setSaving(true)
    setError(null)
    setNotice(null)
    const result = await revokeCredentialShareConsent(consentId, revokeReason.trim())
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? 'Could not revoke consent.')
      return
    }
    setRevokeReason('')
    setNotice('Sharing consent revoked.')
    await load()
  }

  function toggleAttribute(attribute: CredentialShareAttribute) {
    if (attribute === 'credential_type') return
    setAttributes(current => current.includes(attribute)
      ? current.filter(value => value !== attribute)
      : [...current, attribute])
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-neutral-900">Trust Passport</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Review your credentials and decide exactly what to share, with whom, and for how long.
      </p>
      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">No universal trust score or automatic external verification</p>
        <p className="mt-1">New credentials are self-declared. A credential is only shown as verified when an authorised reviewer recorded a verification source.</p>
      </div>
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-neutral-900">Credentials and training</h2>
          {loading ? <p className="mt-4 text-sm text-neutral-600">Loading credentials…</p> : credentials.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">No credentials have been added.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {credentials.map(credential => (
                <li key={credential.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-neutral-900">{credential.credential_name}</h3>
                      <p className="text-sm text-neutral-600">{credential.credential_type}</p>
                    </div>
                    {credential.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> Reviewed by an authorised reviewer
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Self-declared</span>
                    )}
                  </div>
                  {credential.verified && (
                    <p className="mt-2 text-xs text-neutral-600">
                      Source: {verificationSourceLabel(credential.verification_source)}
                      {credential.verified_at && ` · Reviewed ${formatDate(credential.verified_at)}`}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-600">
                    Issued: {credential.issued_at ? formatDate(credential.issued_at) : 'Not provided'}
                    {' · '}Expires: {credential.expires_at ? formatExpiry(credential.expires_at) : 'No expiry recorded'}
                  </p>
                  {credential.expires_at && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Renewal should be completed by the expiry date; submit renewed evidence for review.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={event => void handleAddCredential(event)} className="mt-6 space-y-3 border-t border-neutral-100 pt-5">
            <h3 className="font-medium text-neutral-900">Add a credential</h3>
            <label className="block text-sm font-medium text-neutral-700">
              Credential or training type
              <input required maxLength={100} value={credentialType} onChange={event => setCredentialType(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Name
              <input required maxLength={160} value={credentialName} onChange={event => setCredentialName(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-neutral-700">Issue date
                <input type="date" value={issuedAt} onChange={event => setIssuedAt(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-neutral-700">Expiry date
                <input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
              </label>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save as self-declared'}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-neutral-900">Share with an organisation</h2>
          <p className="mt-1 text-sm text-neutral-600">Sharing is recipient-specific, purpose-limited, and expires automatically.</p>
          <form onSubmit={event => void handleGrantConsent(event)} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-neutral-700">
              Receiving organisation
              <select required value={recipientId} onChange={event => setRecipientId(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
                <option value="">Select an approved organisation</option>
                {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Purpose
              <textarea required minLength={5} maxLength={300} value={purpose} onChange={event => setPurpose(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" rows={3}
                placeholder="Explain why this organisation needs these attributes." />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-neutral-700">Attributes the recipient may access</legend>
              {shareAttributes.map(attribute => (
                <label key={attribute.value} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={attributes.includes(attribute.value)}
                    disabled={attribute.value === 'credential_type'} onChange={() => toggleAttribute(attribute.value)}
                    className="h-4 w-4 rounded border-neutral-300" />
                  {attribute.label}
                </label>
              ))}
            </fieldset>
            <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">
              Preview: {selectedOrganisation?.name ?? 'No organisation selected'} may view {attributes.map(attribute =>
                shareAttributes.find(item => item.value === attribute)?.label.replace(' (required)', ''),
              ).join(', ') || 'no attributes'} for {credentials.length} credential{credentials.length === 1 ? '' : 's'}.
            </p>
            {selectedCredentials.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-brand-700">Review credential attributes before sharing</summary>
                <ul className="mt-2 space-y-1 text-neutral-600">
                  {selectedCredentials.map(credential => (
                    <li key={credential.id}>
                      {credential.credential_type}
                      {attributes.includes('credential_name') && ` · ${credential.credential_name}`}
                      {attributes.includes('expires_at') && credential.expires_at && ` · Expires ${formatDate(credential.expires_at)}`}
                      {attributes.includes('verified') && ` · ${credential.verified ? 'reviewed' : 'self-declared'}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <label className="block text-sm font-medium text-neutral-700">
              Consent expires on
              <input type="date" required value={consentExpiry} onChange={event => setConsentExpiry(event.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>
            <Button type="submit" disabled={saving || loading || !recipientId || !purpose.trim() || !consentExpiry}>
              {saving ? 'Saving consent…' : 'Grant explicit consent'}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">Sharing history and consent status</h2>
        {loading ? <p className="mt-4 text-sm text-neutral-600">Loading sharing history…</p> : consents.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">No credential-sharing consent has been granted.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {consents.map(consent => {
              const recipientName = organisations.find(org => org.id === consent.recipient_org_id)?.name
              const notRevoked = !consent.revoked_at
              return (
                <section key={consent.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-neutral-900">{recipientName ?? `Organisation ${consent.recipient_org_id}`}</h3>
                      <p className="mt-1 text-sm text-neutral-600">Purpose: {consent.purpose}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Granted {formatDate(consent.granted_at)} · Expires {formatDate(consent.expires_at)}
                        {consent.revoked_at && ` · Revoked ${formatDate(consent.revoked_at)}`}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Attributes: {consent.allowed_attributes.join(', ')}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${notRevoked ? 'bg-green-50 text-green-800' : 'bg-neutral-100 text-neutral-700'}`}>
                      {notRevoked ? 'Not revoked; expiry applies' : 'Revoked'}
                    </span>
                  </div>
                  <ol className="mt-3 space-y-1 border-l border-neutral-200 pl-3 text-xs text-neutral-600">
                    {consent.history.map(entry => (
                      <li key={entry.id}>{entry.action === 'granted' ? 'Consent granted' : 'Consent revoked'} · {formatDate(entry.occurred_at)}</li>
                    ))}
                  </ol>
                  {notRevoked && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor={`revoke-reason-${consent.id}`}>Reason for revoking consent</label>
                      <input id={`revoke-reason-${consent.id}`} value={revokeReason}
                        onChange={event => setRevokeReason(event.target.value)} minLength={5} maxLength={300}
                        placeholder="Reason for revoking consent"
                        className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                      <Button type="button" variant="outline" disabled={saving || revokeReason.trim().length < 5}
                        onClick={() => void handleRevoke(consent.id)}>
                        Revoke sharing
                      </Button>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function verificationSourceLabel(source: UserCredential['verification_source']) {
  if (source === 'issuer_confirmation') return 'issuer confirmation'
  if (source === 'document_review') return 'document review'
  if (source === 'organisation_training') return 'organisation training record'
  return 'review source unavailable'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatExpiry(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Expiry date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
