import { supabase } from '@/lib/supabase'
import type { ResourceMatchInput, ResourceMatchResult, ResourceUtilization } from '@/types'

export async function findResourceMatches(input: ResourceMatchInput) {
  const { data, error } = await supabase.rpc('match_resources', {
    _starts_at: input.starts_at,
    _ends_at: input.ends_at,
    _minimum_capacity: input.minimum_capacity ?? 1,
    _location: input.location ?? null,
    _resource_type: input.resource_type ?? null,
    _maximum_cost: input.maximum_cost ?? null,
    _limit: input.limit ?? 20,
  })
  return { data: (data ?? []) as ResourceMatchResult[], error: error?.message ?? null }
}

export async function getResourceUtilization(input: {
  resource_id: string
  from: string
  to: string
}) {
  const { data, error } = await supabase.rpc('get_resource_utilization', {
    _resource_id: input.resource_id,
    _from: input.from,
    _to: input.to,
  })
  return {
    data: data as ResourceUtilization | null,
    error: error?.message ?? (data && !(data as ResourceUtilization).success
      ? (data as ResourceUtilization).error ?? 'Could not load utilization'
      : null),
  }
}