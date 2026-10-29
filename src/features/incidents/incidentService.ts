/**
 * features/incidents/incidentService.ts
 *
 * Incident reporting and resolution for resources.
 */

import { supabase } from '@/lib/supabase'
import type { Incident, IncidentHistoryEntry, IncidentSeverity, IncidentStatus, RpcResult, SafetyHold } from '@/types'

export async function reportIncident(input: {
  resource_id: string
  booking_id?: string
  severity: IncidentSeverity
  title: string
  description: string
}) {
  const { data: result, error } = await supabase.rpc('report_incident', {
    _resource_id: input.resource_id,
    _booking_id: input.booking_id ?? null,
    _severity: input.severity,
    _title: input.title,
    _description: input.description,
  })
  if (error) return { data: null, error: error.message }
  const response = result as RpcResult
  if (!response.success || typeof response.incident_id !== 'string') {
    return { data: null, error: response.error ?? 'Incident report failed' }
  }
  return getIncident(response.incident_id)
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  resolution?: string
) {
  const { data: result, error } = await supabase.rpc('transition_incident', {
    _incident_id: incidentId,
    _new_status: status,
    _reason: resolution ?? '',
    _assignee_id: null,
  })
  if (error) return { data: null, error: error.message }
  const response = result as RpcResult
  if (!response.success) return { data: null, error: response.error ?? 'Incident update failed' }
  return getIncident(incidentId)
}

export async function assignIncident(incidentId: string, assigneeId: string, reason = '') {
  const { data, error } = await supabase.rpc('transition_incident', {
    _incident_id: incidentId,
    _new_status: 'investigating',
    _reason: reason,
    _assignee_id: assigneeId,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function addIncidentEvidence(input: {
  incident_id: string
  storage_path: string
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
  file_size_bytes: number
}) {
  const { data, error } = await supabase.rpc('add_incident_evidence', {
    _incident_id: input.incident_id,
    _storage_path: input.storage_path,
    _mime_type: input.mime_type,
    _file_size_bytes: input.file_size_bytes,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function uploadIncidentEvidence(incidentId: string, file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    return { data: null, error: 'Evidence must be an image or PDF up to 10 MB.' }
  }
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'evidence'
  const path = `incidents/${incidentId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from('incident-evidence')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { data: null, error: uploadError.message }

  const { data, error } = await supabase.rpc('add_incident_evidence', {
    _incident_id: incidentId,
    _storage_path: path,
    _mime_type: file.type,
    _file_size_bytes: file.size,
  })
  const result = data as RpcResult | null
  if (error || !result?.success) {
    await supabase.storage.from('incident-evidence').remove([path])
    return { data: null, error: error?.message ?? result?.error ?? 'Could not attach evidence metadata' }
  }
  return { data: result, error: null }
}

export async function placeSafetyHold(input: {
  resource_id: string
  reason: string
  expires_at?: string
}) {
  const { data, error } = await supabase.rpc('place_resource_safety_hold', {
    _resource_id: input.resource_id,
    _reason: input.reason,
    _expires_at: input.expires_at ?? null,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function releaseSafetyHold(holdId: string, reason: string) {
  const { data, error } = await supabase.rpc('release_resource_safety_hold', {
    _hold_id: holdId,
    _reason: reason,
  })
  if (error) return { success: false, error: error.message } as RpcResult
  return data as RpcResult
}

export async function getSafetyHolds(resourceId: string) {
  const { data, error } = await supabase
    .from('resource_safety_holds')
    .select('*')
    .eq('resource_id', resourceId)
    .order('placed_at', { ascending: false })
  return { data: (data ?? []) as SafetyHold[], error: error?.message ?? null }
}

export async function getIncidentHistory(incidentId: string) {
  const { data, error } = await supabase
    .from('incident_history')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at')
  return { data: (data ?? []) as IncidentHistoryEntry[], error: error?.message ?? null }
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
