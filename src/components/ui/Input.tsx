import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  isRequired?: boolean
  optionalLabel?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    errorText,
    leftIcon,
    rightIcon,
    isRequired,
    optionalLabel,
    disabled,
    id,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const isInvalid = Boolean(errorText)

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <label
            htmlFor={inputId}
            className="font-medium text-neutral-800 flex items-center gap-1"
          >
            {label}
            {isRequired && <span className="text-red-500 font-bold">*</span>}
          </label>
          {optionalLabel && !isRequired && (
            <span className="text-xs text-neutral-400">{optionalLabel}</span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={
            errorText ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${
            isInvalid
              ? 'border-red-300 text-red-900 focus-visible:border-red-500 focus-visible:ring-red-400'
              : 'border-neutral-300 focus-visible:border-brand-500 focus-visible:ring-brand-500'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 flex items-center text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>

      {errorText ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600 font-medium">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})

