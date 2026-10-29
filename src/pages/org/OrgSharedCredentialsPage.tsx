import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui'
import { getConsentedCredentials, getCredentialShareConsentsForOrganisation } from '@/features/eligibility'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { ConsentedCredential, RecipientCredentialShareConsent } from '@/types'

interface SharedConsent extends RecipientCredentialShareConsent {
  credentials: ConsentedCredential[]
  error: string | null
}

export function OrgSharedCredentialsPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [records, setRecords] = useState<SharedConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setLoading(false)
      setRecords([])
      return
    }
    if (!['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)) {
      setError('Only organisation managers can view credentials shared with this organisation.')
      setLoading(false)
      setRecords([])
      return
    }
    setLoading(true)
    setError(null)
    const result = await getCredentialShareConsentsForOrganisation(activeOrganisation.id)
    if (result.error) {
      setError(result.error)
      setRecords([])
      setLoading(false)
      return
    }
    const resolved = await Promise.all(result.data.map(async consent => {
      const credentialResult = await getConsentedCredentials(consent.id, consent.purpose)
      return {
        ...consent,
        credentials: credentialResult.data,
        error: credentialResult.error,
      }
    }))
    setRecords(resolved)
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to view shared credentials.'}</p>
  }
  if (!['owner', 'admin', 'manager'].includes(activeOrganisation.my_role)) {
    return <Card role="alert" className="mt-4 border-amber-200 bg-amber-50 text-sm text-amber-900">Only organisation managers can view credentials shared with this organisation.</Card>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Credentials shared with your organisation</h1>
      <p className="mt-1 text-sm text-neutral-600">
        The database returns only attributes authorised by active consent for {activeOrganisation.name}. Use each record only for its stated purpose.
      </p>
      <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Access is revalidated by a server-side RPC. Revoked or expired consent is not returned. Credential documents and other profile information are not included.
      </p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 space-y-4" aria-busy={loading}>
        {loading ? <Card className="text-sm text-neutral-600">Loading consented credentials…</Card>
          : error && records.length === 0 ? null
          : records.length === 0 ? <Card className="py-10 text-center text-sm text-neutral-600">No active credential-sharing consent is available.</Card>
          : records.map(record => (
            <Card key={record.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">Credential-sharing consent</h2>
                  <p className="mt-1 text-sm text-neutral-600">Purpose: {record.purpose}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Granted {formatDate(record.granted_at)} · Expires {formatDate(record.expires_at)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Permitted: {record.allowed_attributes.join(', ')}</p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">Active consent</span>
              </div>
              {record.error ? (
                <p role="alert" className="mt-4 text-sm text-red-700">Could not load attributes for this consent: {record.error}</p>
              ) : record.credentials.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-600">No credential records are currently available under this consent.</p>
              ) : (
                <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                  {record.credentials.map((credential, index) => (
                    <li key={`${credential.credential_type}-${index}`} className="rounded-md bg-neutral-50 p-3">
                      <p className="font-medium text-neutral-900">{credential.credential_type}</p>
                      {record.allowed_attributes.includes('credential_name') && credential.credential_name && (
                        <p className="mt-1 text-sm text-neutral-700">{credential.credential_name}</p>
                      )}
                      {record.allowed_attributes.includes('issued_at') && credential.issued_at && (
                        <p className="mt-1 text-xs text-neutral-600">Issued {formatDate(credential.issued_at)}</p>
                      )}
                      {record.allowed_attributes.includes('expires_at') && credential.expires_at && (
                        <p className="mt-1 text-xs text-neutral-600">Expires {formatDate(credential.expires_at)}</p>
                      )}
                      {record.allowed_attributes.includes('verified') && credential.verified !== null && (
                        <p className="mt-1 text-xs text-neutral-600">
                          {credential.verified ? 'Verified record (verification source not shared)' : 'Self-declared'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
      </div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
