import { type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

export type AlertVariant = 'error' | 'warning' | 'info' | 'success'

export interface AlertProps {
  variant?: AlertVariant
  title?: ReactNode
  children: ReactNode
  onClose?: () => void
  action?: ReactNode
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: typeof AlertCircle; iconColor: string; titleColor: string }
> = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
  },
  info: {
    container: 'border-brand-200 bg-brand-50 text-brand-800',
    icon: Info,
    iconColor: 'text-brand-600',
    titleColor: 'text-brand-900',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
  },
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  action,
  className = '',
}: AlertProps) {
  const styles = variantStyles[variant]
  const Icon = styles.icon

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 rounded-lg border p-4 text-xs sm:text-sm leading-relaxed ${styles.container} ${className}`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold mb-1 ${styles.titleColor}`}>{title}</h4>
        )}
        <div>{children}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 -mr-1 -mt-1 rounded-md p-1.5 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function ErrorMessage({
  message,
  className = '',
}: {
  message?: string | null
  className?: string
}) {
  if (!message) return null

  return (
    <div className={`flex items-center gap-1.5 text-xs text-red-600 font-medium ${className}`}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

