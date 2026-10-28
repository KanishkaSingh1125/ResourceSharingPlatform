import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react'

export interface UserMenuProps {
  name?: string
  email?: string
  role?: string
  avatarUrl?: string
  onSignOut?: () => void
}

export function UserMenu({
  name = 'Dr. Sarah Connor',
  email = 's.connor@mit.edu',
  role = 'Research Fellow',
  avatarUrl,
  onSignOut,
}: UserMenuProps) {
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-neutral-100 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
          )}
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-neutral-800 leading-tight">
            {name}
          </span>
          <span className="text-[10px] text-neutral-400">{role}</span>
        </div>

        <ChevronDown
          className={`hidden sm:block h-3.5 w-3.5 text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg">
          <div className="border-b border-neutral-100 px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-neutral-900 truncate">{name}</p>
            <p className="text-[11px] text-neutral-500 truncate">{email}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              <Shield className="h-3 w-3 text-brand-600" />
              <span>{role}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-neutral-500" />
              <span>Personal Dashboard</span>
            </Link>

            <Link
              to="/org"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-neutral-500" />
              <span>Organisation Workspace</span>
            </Link>

            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-neutral-500" />
              <span>Settings</span>
            </Link>
          </div>

          <div className="border-t border-neutral-100 pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                if (onSignOut) onSignOut()
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

