/**
 * features/organisations/organisationService.ts
 *
 * Server-side operations for organisation CRUD, membership management,
 * and verification state transitions. All operations go through RLS
 * and SECURITY DEFINER functions — no service-role key is used.
 */

import { supabase } from '@/lib/supabase'
import type {
  Organisation,
  CreateOrganisationInput,
  OrgMember,
  InviteMemberInput,
  VerificationDecision,
  VerificationDocument,
  UploadDocumentInput,
  VerificationStatus,
  RpcResult,
  PaginatedResponse,
  OrgSharingAnalytics,
} from '@/types'

// ── Organisation CRUD ────────────────────────────────────────────────────────

export async function createOrganisation(input: CreateOrganisationInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('organisations')
    .insert({ ...input, created_by: user.id })
    .select()
    .single()

  return { data: data as Organisation | null, error: error?.message ?? null }
}

export async function getOrganisation(id: string) {
  const { data, error } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', id)
    .single()

  return { data: data as Organisation | null, error: error?.message ?? null }
}

export async function getOrganisationBySlug(slug: string) {
  const { data, error } = await supabase
    .from('organisations')
    .select('*')
    .eq('slug', slug)
    .single()

  return { data: data as Organisation | null, error: error?.message ?? null }
}

export async function updateOrganisation(id: string, updates: Partial<Pick<Organisation,
  'name' | 'description' | 'logo_url' | 'website' | 'contact_email' | 'contact_phone' | 'address'
>>) {
  const { data, error } = await supabase
    .from('organisations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data: data as Organisation | null, error: error?.message ?? null }
}

export async function listOrganisations(opts: {
  status?: VerificationStatus
  page?: number
  pageSize?: number
} = {}): Promise<PaginatedResponse<Organisation> & { error: string | null }> {
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('organisations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts.status) {
    query = query.eq('verification_status', opts.status)
  }

  const { data, count, error } = await query

  return {
    data: (data ?? []) as Organisation[],
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > page * pageSize,
    error: error?.message ?? null,
  }
}

export async function getMyOrganisations() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role, organisations(*)')
    .eq('user_id', user.id)

  if (error) return { data: [], error: error.message }

  const orgs = (data ?? []).map((m: Record<string, unknown>) => ({
    ...(m.organisations as Organisation),
    my_role: m.role as string,
  }))

  return { data: orgs, error: null }
}

// ── Membership ───────────────────────────────────────────────────────────────

export async function getOrgMembers(orgId: string) {
  const { data, error } = await supabase
    .from('org_members')
    .select('*, profiles!user_id(display_name, email, avatar_url)')
    .eq('org_id', orgId)
    .order('joined_at')

  return { data: (data ?? []) as OrgMember[], error: error?.message ?? null }
}

export async function inviteMember(input: InviteMemberInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const role = input.role ?? 'member'
  // Prevent directly assigning owner role via invite
  if (role === 'owner') {
    return { data: null, error: 'Cannot assign owner role via invite' }
  }

  const { data, error } = await supabase
    .from('org_members')
    .insert({
      org_id: input.org_id,
      user_id: input.user_id,
      role,
      invited_by: user.id,
    })
    .select()
    .single()

  return { data: data as OrgMember | null, error: error?.message ?? null }
}

export async function updateMemberRole(memberId: string, role: 'admin' | 'manager' | 'member') {
  const { data, error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()

  return { data: data as OrgMember | null, error: error?.message ?? null }
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', memberId)

  return { error: error?.message ?? null }
}

// ── Verification ─────────────────────────────────────────────────────────────

export async function transitionVerificationStatus(
  orgId: string,
  newStatus: VerificationStatus,
  reason = ''
) {
  const { data, error } = await supabase.rpc('transition_verification_status', {
    _org_id: orgId,
    _new_status: newStatus,
    _reason: reason,
  })

  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function getVerificationHistory(orgId: string) {
  const { data, error } = await supabase
    .from('verification_decisions')
    .select('*')
    .eq('org_id', orgId)
    .order('decided_at', { ascending: false })

  return { data: (data ?? []) as VerificationDecision[], error: error?.message ?? null }
}

export async function getOrgSharingAnalytics(orgId: string, from: string, to: string) {
  const { data, error } = await supabase.rpc('get_org_sharing_analytics', {
    _org_id: orgId,
    _from: from,
    _to: to,
  })
  if (error) return { data: null, error: error.message }
  const result = data as OrgSharingAnalytics
  if (!result.success) return { data: null, error: result.error ?? 'Could not load organisation analytics' }
  return { data: result, error: null }
}

// ── Verification Documents ───────────────────────────────────────────────────

export async function uploadVerificationDocument(input: UploadDocumentInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('verification_documents')
    .insert({ ...input, uploaded_by: user.id })
    .select()
    .single()

  return { data: data as VerificationDocument | null, error: error?.message ?? null }
}

export async function getVerificationDocuments(orgId: string) {
  const { data, error } = await supabase
    .from('verification_documents')
    .select('*')
    .eq('org_id', orgId)
    .order('uploaded_at', { ascending: false })

  return { data: (data ?? []) as VerificationDocument[], error: error?.message ?? null }
}

export async function deleteVerificationDocument(docId: string) {
  const { error } = await supabase
    .from('verification_documents')
    .delete()
    .eq('id', docId)

  return { error: error?.message ?? null }
}
