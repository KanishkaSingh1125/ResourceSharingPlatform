import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Filter, ChevronDown, Check, X } from 'lucide-react'

export interface FilterOption {
  id: string
  label: string
  count?: number
}

export interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  selectedValues: string[]
  onChange: (selected: string[]) => void
  multiSelect?: boolean
  icon?: ReactNode
}

export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  multiSelect = true,
  icon,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (id: string) => {
    if (multiSelect) {
      if (selectedValues.includes(id)) {
        onChange(selectedValues.filter((v) => v !== id))
      } else {
        onChange([...selectedValues, id])
      }
    } else {
      onChange(selectedValues.includes(id) ? [] : [id])
      setIsOpen(false)
    }
  }

  const clearSelection = () => {
    onChange([])
  }

  const hasSelection = selectedValues.length > 0

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
          hasSelection
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
        }`}
        aria-expanded={isOpen}
      >
        {icon || <Filter className="h-3.5 w-3.5" />}
        <span>{label}</span>
        {hasSelection && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg">
          <div className="mb-1 flex items-center justify-between border-b border-neutral-100 px-2 py-1 text-xs text-neutral-500">
            <span>Filter by {label}</span>
            {hasSelection && (
              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <span>{option.label}</span>
                  </span>
                  {option.count !== undefined && (
                    <span className="text-[11px] text-neutral-400">{option.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

