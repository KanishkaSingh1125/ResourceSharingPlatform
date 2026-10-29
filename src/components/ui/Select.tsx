import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  errorText?: string
  isRequired?: boolean
  options?: SelectOption[]
  placeholder?: string
  leftIcon?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    helperText,
    errorText,
    isRequired,
    options,
    placeholder,
    leftIcon,
    disabled,
    id,
    className = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const isInvalid = Boolean(errorText)

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-neutral-800 flex items-center gap-1"
        >
          {label}
          {isRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
            {leftIcon}
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={`w-full appearance-none rounded-md border bg-white px-3 py-2 pr-9 text-sm text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${
            leftIcon ? 'pl-9' : ''
          } ${
            isInvalid
              ? 'border-red-300 text-red-900 focus-visible:border-red-500 focus-visible:ring-red-400'
              : 'border-neutral-300 focus-visible:border-brand-500 focus-visible:ring-brand-500'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="pointer-events-none absolute right-3 flex items-center text-neutral-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {errorText ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{errorText}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-neutral-500">{helperText}</p>
      ) : null}
    </div>
  )
})

