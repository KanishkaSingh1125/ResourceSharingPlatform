import { useState } from 'react'
import { Database, CheckCircle2, X } from 'lucide-react'
import { isSupabaseConfigured, getSupabaseConfigStatus } from '@/lib/supabase'

export function BackendStatusBanner() {
  const [dismissed, setDismissed] = useState(false)
  const status = getSupabaseConfigStatus()

  if (dismissed) return null

  if (isSupabaseConfigured) {
    return (
      <div className="bg-emerald-50/80 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Connected to Supabase PostgreSQL Backend (
            <strong className="font-mono">{status.urlDomain || 'live instance'}</strong>
            ) with Row Level Security.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-700 hover:text-emerald-900 text-[11px] font-medium"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Database className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="truncate">
          Local-First Engine Active — Supabase credentials not detected in <code className="bg-amber-100 px-1 rounded">.env</code>. All data is persisted locally with full schema fidelity.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-800"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
