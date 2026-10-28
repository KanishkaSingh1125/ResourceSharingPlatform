import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  LogOut,
  Shield,
  ChevronDown,
  Building2,
  Check,
  HelpCircle,
} from 'lucide-react'
import { useRole } from '@/context'
import { ROLE_DEFINITIONS } from '@/config/navigation'
import { type UserRole } from '@/types/navigation'

interface UserProfileMenuProps {
  isCollapsed?: boolean
  align?: 'top' | 'bottom'
}

export function UserProfileMenu({ isCollapsed = false, align = 'top' }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { currentRole, setRole, userProfile } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRoleChange = (role: UserRole) => {
    setRole(role)
    const targetHome = ROLE_DEFINITIONS[role].homePath
    navigate(targetHome)
    setIsOpen(false)
  }

  const roleOptions: UserRole[] = [
    'member',
    'manager',
    'org_admin',
    'platform_admin',
  ]

  return (
    <div ref={menuRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center rounded-xl p-2 transition-colors hover:bg-neutral-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          isCollapsed ? 'justify-center w-full' : 'justify-between w-full'
        }`}
        aria-expanded={isOpen}
        aria-label="User profile and role menu"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with initials */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white shadow-2xs">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              userProfile.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
            )}
          </div>

          {/* User & Org Details (Expanded) */}
          {!isCollapsed && (
            <div className="flex flex-col text-left min-w-0">
              <span className="truncate text-xs font-bold text-neutral-900 group-hover:text-brand-700 transition-colors">
                {userProfile.name}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                <span className="truncate max-w-[120px]">{userProfile.organisation}</span>
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            isCollapsed ? 'left-full ml-3' : 'left-0'
          } z-50 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95`}
        >
          {/* User Header Summary */}
          <div className="rounded-xl bg-neutral-50 p-3 mb-2 border border-neutral-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">
                  {userProfile.name}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">
                  {userProfile.email}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                {ROLE_DEFINITIONS[currentRole].label.split(' ')[0]}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-600 border-t border-neutral-200/50 pt-2">
              <Building2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{userProfile.organisation}</span>
            </div>
          </div>

          {/* Role Switcher Section */}
          <div className="p-1 mb-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Switch Role / Preview
              </span>
              <span className="text-[10px] text-brand-600 font-medium">Demo Mode</span>
            </div>

            <div className="space-y-1">
              {roleOptions.map((role) => {
                const isSelected = role === currentRole
                const def = ROLE_DEFINITIONS[role]

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`flex w-full items-start justify-between rounded-lg p-2 text-left transition-all ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-300'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">
                        {def.label}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 truncate max-w-[200px]">
                        {def.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <hr className="my-1 border-neutral-100" />

          {/* Account & Support links */}
          <div className="space-y-0.5 p-1">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-neutral-400" />
              <span>Profile & Account</span>
            </Link>

            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-neutral-400" />
              <span>Help & Support</span>
            </Link>

            <Link
              to="/org/verification"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-neutral-400" />
              <span>Verification Status</span>
            </Link>
          </div>

          <hr className="my-1 border-neutral-100" />

          {/* Logout */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/login')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
