import { useOutletContext } from 'react-router-dom'
import type { Organisation } from '@/types'

export interface OrgWorkspace extends Organisation {
  my_role: string
}

export interface OrgLayoutContext {
  organisations: OrgWorkspace[]
  activeOrganisation: OrgWorkspace | null
  setActiveOrganisationId: (id: string) => void
  loading: boolean
  error: string | null
}

export function useOrgWorkspace() {
  return useOutletContext<OrgLayoutContext>()
}
