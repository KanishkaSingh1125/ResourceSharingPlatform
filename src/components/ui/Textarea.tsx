import { forwardRef, type TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  errorText?: string
  isRequired?: boolean
  optionalLabel?: string
  maxCharacters?: number
  currentCount?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    errorText,
    isRequired,
    optionalLabel,
    maxCharacters,
    currentCount,
    disabled,
    id,
    rows = 4,
    className = '',
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const isInvalid = Boolean(errorText)

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <label
            htmlFor={textareaId}
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

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        aria-invalid={isInvalid}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 resize-y ${
          isInvalid
            ? 'border-red-300 text-red-900 focus-visible:border-red-500 focus-visible:ring-red-400'
            : 'border-neutral-300 focus-visible:border-brand-500 focus-visible:ring-brand-500'
        } ${className}`}
        {...props}
      />

      <div className="mt-1.5 flex items-center justify-between text-xs">
        {errorText ? (
          <p className="text-red-600 font-medium">{errorText}</p>
        ) : helperText ? (
          <p className="text-neutral-500">{helperText}</p>
        ) : (
          <span />
        )}

        {maxCharacters && (
          <span
            className={`shrink-0 ml-2 ${
              currentCount && currentCount > maxCharacters
                ? 'text-red-600 font-medium'
                : 'text-neutral-400'
            }`}
          >
            {currentCount ?? 0}/{maxCharacters}
          </span>
        )}
      </div>
    </div>
  )
})

