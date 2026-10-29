import { type FormEvent, forwardRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  onClear?: () => void
  placeholder?: string
  isLoading?: boolean
  shortcutKey?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  autoFocus?: boolean
}

const sizeClasses = {
  sm: 'py-1.5 pl-8 pr-7 text-xs',
  md: 'py-2 pl-9 pr-8 text-sm',
  lg: 'py-2.5 pl-11 pr-9 text-base',
}

const iconSizes = {
  sm: 'h-3.5 w-3.5 left-2.5',
  md: 'h-4 w-4 left-3',
  lg: 'h-5 w-5 left-3.5',
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value,
    onChange,
    onSubmit,
    onClear,
    placeholder = 'Search resources, equipment, organisations...',
    isLoading = false,
    shortcutKey,
    className = '',
    size = 'md',
    autoFocus = false,
  },
  ref
) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(value)
    }
  }

  const handleClear = () => {
    onChange('')
    if (onClear) {
      onClear()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center w-full ${className}`}>
      <div
        className={`pointer-events-none absolute flex items-center text-neutral-400 ${iconSizes[size]}`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin text-brand-600" />
        ) : (
          <Search className="h-full w-full" />
        )}
      </div>

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 shadow-2xs transition-colors focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 ${sizeClasses[size]}`}
      />

      <div className="absolute right-2.5 flex items-center gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : shortcutKey ? (
          <kbd className="hidden sm:inline-flex items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 shadow-2xs">
            {shortcutKey}
          </kbd>
        ) : null}
      </div>
    </form>
  )
})

