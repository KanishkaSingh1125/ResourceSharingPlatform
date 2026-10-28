import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type StatTrend = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    trend: StatTrend
    period?: string
  }
  icon: ReactNode
  iconColor?: 'brand' | 'success' | 'warning' | 'purple' | 'neutral'
  description?: string
  onClick?: () => void
  className?: string
}

const colorStyles = {
  brand: {
    bg: 'bg-brand-50',
    text: 'text-brand-600',
    border: 'border-brand-100',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
  },
  neutral: {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-200',
  },
}

export function StatCard({
  title,
  value,
  change,
  icon,
  iconColor = 'brand',
  description,
  onClick,
  className = '',
}: StatCardProps) {
  const styles = colorStyles[iconColor]

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition-all ${
        onClick ? 'cursor-pointer hover:border-neutral-300 hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${styles.border} ${styles.bg} ${styles.text}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {value}
        </span>
      </div>

      {(change || description) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                change.trend === 'up'
                  ? 'text-emerald-600'
                  : change.trend === 'down'
                  ? 'text-red-600'
                  : 'text-neutral-500'
              }`}
            >
              {change.trend === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : change.trend === 'down' ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
              {change.value}
            </span>
          )}

          {change?.period && (
            <span className="text-neutral-400 font-normal">{change.period}</span>
          )}

          {description && !change && (
            <span className="text-neutral-500">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}

