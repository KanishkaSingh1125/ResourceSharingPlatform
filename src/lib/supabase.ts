import { createClient } from '@supabase/supabase-js'
export type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function getValidSupabaseUrl(value?: string): URL | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    const secure = url.protocol === 'https:'
    const localDevelopmentUrl =
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    return secure || localDevelopmentUrl ? url : null
  } catch {
    return null
  }
}

const parsedSupabaseUrl = getValidSupabaseUrl(supabaseUrl)
const hasAnonKey = Boolean(supabaseAnonKey?.trim())
export const isSupabaseConfigured = Boolean(parsedSupabaseUrl && hasAnonKey)

export interface SupabaseConfigStatus {
  isConfigured: boolean
  hasUrl: boolean
  hasAnonKey: boolean
  urlDomain?: string
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return {
    isConfigured: isSupabaseConfigured,
    hasUrl: Boolean(parsedSupabaseUrl),
    hasAnonKey,
    urlDomain: parsedSupabaseUrl?.hostname,
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
