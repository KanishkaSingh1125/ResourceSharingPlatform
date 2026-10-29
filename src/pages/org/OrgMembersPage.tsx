import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui'
import { getOrgMembers } from '@/features/organisations'
import { useOrgWorkspace } from '@/features/organisations/orgWorkspaceContext'
import type { OrgMember } from '@/types'

export function OrgMembersPage() {
  const { activeOrganisation, loading: orgLoading } = useOrgWorkspace()
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeOrganisation) {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getOrgMembers(activeOrganisation.id)
    setMembers(result.data)
    setError(result.error)
    setLoading(false)
  }, [activeOrganisation])

  useEffect(() => { void load() }, [load])

  if (orgLoading || !activeOrganisation) {
    return <p className="text-sm text-neutral-600">{orgLoading ? 'Loading organisation…' : 'Select an organisation to view members.'}</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Members</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Membership records visible to members of {activeOrganisation.name}. Role changes remain restricted to backend-authorised workflows.
      </p>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 space-y-3" aria-busy={loading}>
        {loading ? <Card className="text-sm text-neutral-600">Loading organisation members…</Card>
          : error && members.length === 0 ? null
          : members.length === 0 ? <Card className="text-sm text-neutral-600">No member records are available.</Card>
          : members.map(member => (
            <Card key={member.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">{member.profiles?.display_name || 'Member'}</p>
                <p className="truncate text-sm text-neutral-600">{member.profiles?.email || 'Email unavailable'}</p>
                <p className="mt-1 text-xs text-neutral-500">Joined {formatDate(member.joined_at)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{member.role}</span>
            </Card>
          ))}
      </div>
      <p className="mt-5 text-xs text-neutral-500">
        The current membership schema has no invitation-by-email workflow, and membership role changes do not consistently create audit events. This screen therefore shows only records; it does not offer unlogged mutations.
      </p>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
