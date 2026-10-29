import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showHome?: boolean
  className?: string
}

export function Breadcrumbs({
  items,
  showHome = true,
  className = '',
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-neutral-500 ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="flex items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-1.5">
              {(showHome || index > 0) && (
                <ChevronRight className="h-3 w-3 text-neutral-400 shrink-0" />
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-neutral-800" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

