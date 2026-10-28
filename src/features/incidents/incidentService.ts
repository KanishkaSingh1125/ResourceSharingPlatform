/**
 * features/incidents/incidentService.ts
 *
 * Incident reporting and resolution for resources.
 */

import { supabase } from '@/lib/supabase'
import type { Incident, IncidentSeverity, IncidentStatus } from '@/types'

export async function reportIncident(input: {
  resource_id: string
  booking_id?: string
  severity: IncidentSeverity
  title: string
  description: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('incidents')
    .insert({ ...input, reported_by: user.id })
    .select()
    .single()

  if (data) {
    // Create notification for org managers
    await supabase.from('notifications').insert({
      user_id: user.id,  // Will be replaced with org manager IDs in production
      type: 'incident_reported',
      title: `Incident: ${input.title}`,
      body: `Severity: ${input.severity}. ${input.description.substring(0, 100)}`,
      metadata: { incident_id: data.id, resource_id: input.resource_id },
    })

    // Audit
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'incident_reported',
      entity_type: 'incident',
      entity_id: data.id,
      metadata: { severity: input.severity, resource_id: input.resource_id },
    })
  }

  return { data: data as Incident | null, error: error?.message ?? null }
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  resolution?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const updates: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'closed') {
    updates.resolved_by = user.id
    updates.resolved_at = new Date().toISOString()
    if (resolution) updates.resolution = resolution
  }

  const { data, error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', incidentId)
    .select()
    .single()

  if (data) {
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'incident_status_change',
      entity_type: 'incident',
      entity_id: incidentId,
      metadata: { new_status: status },
    })
  }

  return { data: data as Incident | null, error: error?.message ?? null }
}

export async function getResourceIncidents(resourceId: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })

  return { data: (data ?? []) as Incident[], error: error?.message ?? null }
}

export async function getIncident(id: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single()

  return { data: data as Incident | null, error: error?.message ?? null }
}
