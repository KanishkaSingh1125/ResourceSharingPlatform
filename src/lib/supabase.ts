import { createClient } from '@supabase/supabase-js'
export type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== ''
)

export interface SupabaseConfigStatus {
  isConfigured: boolean
  hasUrl: boolean
  hasAnonKey: boolean
  urlDomain?: string
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return {
    isConfigured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl && supabaseUrl.trim() !== ''),
    hasAnonKey: Boolean(supabaseAnonKey && supabaseAnonKey.trim() !== ''),
    urlDomain: supabaseUrl ? new URL(supabaseUrl).hostname : undefined,
  }
}

if (!isSupabaseConfigured) {
  console.info(
    '[ShareSphere] Supabase credentials not detected in .env. ' +
    'Running in persistent local-first multi-tenant development mode with full schema parity.'
  )
}

export const supabase = createClient<any>(
  isSupabaseConfigured ? supabaseUrl! : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey! : 'placeholder-anon-key'
)
