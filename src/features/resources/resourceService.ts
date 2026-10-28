/**
 * features/resources/resourceService.ts
 *
 * Resource catalogue: CRUD, search/filter/sort/paginate,
 * availability windows, and maintenance blocks.
 */

import { supabase } from '@/lib/supabase'
import type {
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
  ResourceSearchFilters,
  ResourceCategory,
  AvailabilityWindow,
  MaintenanceBlock,
  PaginatedResponse,
} from '@/types'

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('resource_categories')
    .select('*')
    .order('sort_order')

  return { data: (data ?? []) as ResourceCategory[], error: error?.message ?? null }
}

// ── Resource CRUD ────────────────────────────────────────────────────────────

export async function createResource(input: CreateResourceInput) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('resources')
    .insert({ ...input, created_by: user.id })
    .select('*, organisations(name, slug, verification_status), resource_categories(name, slug, icon)')
    .single()

  return { data: data as Resource | null, error: error?.message ?? null }
}

export async function getResource(id: string) {
  const { data, error } = await supabase
    .from('resources')
    .select('*, organisations(name, slug, verification_status), resource_categories(name, slug, icon)')
    .eq('id', id)
    .single()

  return { data: data as Resource | null, error: error?.message ?? null }
}

export async function updateResource(id: string, updates: UpdateResourceInput) {
  const { data, error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', id)
    .select('*, organisations(name, slug, verification_status), resource_categories(name, slug, icon)')
    .single()

  return { data: data as Resource | null, error: error?.message ?? null }
}

// ── Search / List ────────────────────────────────────────────────────────────

/**
 * Search resources with filters, sorting, and pagination.
 * Only published resources from approved organisations are shown
 * to general users (RLS handles draft/member visibility).
 */
export async function searchResources(
  filters: ResourceSearchFilters = {}
): Promise<PaginatedResponse<Resource>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('resources')
    .select(
      '*, organisations!inner(name, slug, verification_status), resource_categories(name, slug, icon)',
      { count: 'exact' }
    )
    .eq('publication_status', 'published')
    .eq('organisations.verification_status', 'approved')
    .range(from, to)

  // Apply filters
  if (filters.query) {
    query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters.org_id) {
    query = query.eq('org_id', filters.org_id)
  }
  if (filters.resource_type) {
    query = query.eq('resource_type', filters.resource_type)
  }
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`)
  }

  // Sorting
  const sortBy = filters.sortBy ?? 'created_at'
  const sortOrder = filters.sortOrder ?? 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const { data, count } = await query

  return {
    data: (data ?? []) as Resource[],
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > page * pageSize,
  }
}

/**
 * Get all resources for a specific organisation (including unpublished).
 * RLS ensures only members can see non-published resources.
 */
export async function getOrgResources(orgId: string) {
  const { data, error } = await supabase
    .from('resources')
    .select('*, resource_categories(name, slug, icon)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return { data: (data ?? []) as Resource[], error: error?.message ?? null }
}

// ── Availability Windows ─────────────────────────────────────────────────────

export async function getAvailability(resourceId: string) {
  const { data, error } = await supabase
    .from('availability_windows')
    .select('*')
    .eq('resource_id', resourceId)
    .order('day_of_week')
    .order('start_time')

  return { data: (data ?? []) as AvailabilityWindow[], error: error?.message ?? null }
}

export async function setAvailability(resourceId: string, windows: Omit<AvailabilityWindow, 'id'>[]) {
  // Replace all windows for this resource
  const { error: delError } = await supabase
    .from('availability_windows')
    .delete()
    .eq('resource_id', resourceId)

  if (delError) return { error: delError.message }

  if (windows.length === 0) return { error: null }

  const { error } = await supabase
    .from('availability_windows')
    .insert(windows.map(w => ({ ...w, resource_id: resourceId })))

  return { error: error?.message ?? null }
}

// ── Maintenance Blocks ───────────────────────────────────────────────────────

export async function getMaintenanceBlocks(resourceId: string) {
  const { data, error } = await supabase
    .from('maintenance_blocks')
    .select('*')
    .eq('resource_id', resourceId)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')

  return { data: (data ?? []) as MaintenanceBlock[], error: error?.message ?? null }
}

export async function createMaintenanceBlock(block: {
  resource_id: string
  reason: string
  starts_at: string
  ends_at: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('maintenance_blocks')
    .insert({ ...block, created_by: user.id })
    .select()
    .single()

  return { data: data as MaintenanceBlock | null, error: error?.message ?? null }
}

export async function deleteMaintenanceBlock(blockId: string) {
  const { error } = await supabase
    .from('maintenance_blocks')
    .delete()
    .eq('id', blockId)

  return { error: error?.message ?? null }
}
