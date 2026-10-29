import { forwardRef, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react'

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-neutral-200">
      <table
        ref={ref}
        className={`w-full caption-bottom text-left text-sm ${className}`}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <thead
    ref={ref}
    className={`border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold text-neutral-600 uppercase tracking-wider ${className}`}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tbody
    ref={ref}
    className={`divide-y divide-neutral-200 bg-white ${className}`}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t border-neutral-200 bg-neutral-50 font-medium text-neutral-800 ${className}`}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => (
    <tr
      ref={ref}
      className={`transition-colors hover:bg-neutral-50/80 ${className}`}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <th
    ref={ref}
    className={`h-10 px-4 py-3 align-middle text-left font-semibold text-neutral-600 ${className}`}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className = '', ...props }, ref) => (
  <td
    ref={ref}
    className={`px-4 py-3.5 align-middle text-neutral-800 ${className}`}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className = '', ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-3 text-xs text-neutral-500 ${className}`}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

