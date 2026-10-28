import { type HTMLAttributes, type ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white shadow-xs transition-all ${
        hover ? 'hover:border-neutral-300 hover:shadow-md' : ''
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
  children?: ReactNode
}) {
  if (children) {
    return <div className={`mb-4 flex flex-col gap-1 ${className}`}>{children}</div>
  }

  return (
    <div className={`mb-4 flex items-start justify-between gap-4 ${className}`}>
      <div>
        {title && <h3 className="text-base font-semibold text-neutral-900">{title}</h3>}
        {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardContent({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={className}>{children}</div>
}

export function CardFooter({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 ${className}`}
    >
      {children}
    </div>
  )
}
