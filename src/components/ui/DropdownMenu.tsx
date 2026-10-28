import { useState, useRef, useEffect, type ReactNode } from 'react'

export interface DropdownMenuItem {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  divider?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownMenuItem[]
  align?: 'left' | 'right'
  width?: string
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  width = 'w-48',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 mt-1.5 ${width} rounded-lg border border-neutral-200 bg-white p-1 shadow-lg focus:outline-none`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <hr key={`divider-${index}`} className="my-1 border-neutral-100" />
            }

            const isDanger = item.variant === 'danger'

            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick()
                    setIsOpen(false)
                  }
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed text-neutral-400'
                    : isDanger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

