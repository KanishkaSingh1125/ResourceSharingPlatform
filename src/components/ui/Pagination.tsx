import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Generate pagination range with ellipses
  const getPageNumbers = () => {
    const delta = 1
    const range: (number | string)[] = []
    const rangeWithDots: (number | string)[] = []
    let l: number | undefined

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i)
      }
    }

    for (const i of range) {
      if (l) {
        if (typeof i === 'number' && i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (typeof i === 'number' && i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      if (typeof i === 'number') l = i
    }

    return rangeWithDots
  }

  const pages = getPageNumbers()

  const startItem = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined
  const endItem =
    itemsPerPage && totalItems
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : undefined

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6 ${className}`}
    >
      {/* Result counter */}
      {totalItems !== undefined && (
        <div className="text-xs text-neutral-500">
          Showing <span className="font-semibold text-neutral-800">{startItem}</span> to{' '}
          <span className="font-semibold text-neutral-800">{endItem}</span> of{' '}
          <span className="font-semibold text-neutral-800">{totalItems}</span> results
        </div>
      )}

      {/* Page controls */}
      <nav
        className="inline-flex items-center -space-x-px rounded-md shadow-2xs"
        aria-label="Pagination"
      >
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-l-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, index) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="relative inline-flex items-center border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-400 select-none"
              >
                ...
              </span>
            )
          }

          const pageNum = Number(p)
          const isCurrent = pageNum === currentPage

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`relative inline-flex items-center border px-3 py-1.5 text-xs font-medium transition-colors ${
                isCurrent
                  ? 'z-10 border-brand-600 bg-brand-600 text-white font-semibold'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {pageNum}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center rounded-r-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}

