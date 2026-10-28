/**
 * A reusable full-page or inline loading spinner.
 */

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  /** Show as a full-screen centred overlay */
  fullPage?: boolean
  /** Accessible label */
  label?: string
}

export function LoadingSpinner({
  fullPage = false,
  label = 'Loading…',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      <span className="text-sm text-neutral-500">{label}</span>
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
