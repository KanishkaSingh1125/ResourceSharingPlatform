import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, Sparkles, Building2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui'

interface PublicNavLink {
  to: string
  label: string
  highlight?: boolean
}

const publicNavLinks: PublicNavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore Resources' },
  { to: '/#organisations', label: 'Organisations' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/design-system', label: 'Design System', highlight: true },
]

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleScrollToHash = (hash: string) => {
    if (hash.startsWith('/#')) {
      const elementId = hash.replace('/#', '')
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-neutral-900 group-hover:text-brand-700 transition-colors">
              ShareSphere
            </span>
            <span className="text-[10px] -mt-1 font-medium text-neutral-400">
              Multi-Organisation Sharing
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {publicNavLinks.map(({ to, label, highlight }) => {
            const isAnchor = to.startsWith('/#')

            if (isAnchor) {
              return (
                <a
                  key={to}
                  href={to}
                  onClick={(e) => {
                    if (window.location.pathname === '/') {
                      e.preventDefault()
                      handleScrollToHash(to)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs lg:text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  {label}
                </a>
              )
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs lg:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : highlight
                      ? 'text-brand-600 hover:bg-brand-50/60 font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`
                }
              >
                {highlight && <Sparkles className="h-3.5 w-3.5 text-brand-500" />}
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Auth & Registration CTAs */}
        <div className="flex items-center gap-2.5">
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>

          <Link to="/join" className="hidden lg:block">
            <Button variant="outline" size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
              Join as an Individual
            </Button>
          </Link>

          <Link to="/register-org">
            <Button size="sm" leftIcon={<Building2 className="h-3.5 w-3.5" />}>
              Register Organisation
            </Button>
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav className="border-t border-neutral-200 bg-white px-4 pb-6 pt-3 md:hidden shadow-lg animate-in slide-in-from-top-2">
          <div className="space-y-1">
            {publicNavLinks.map(({ to, label, highlight }) => (
              <a
                key={to}
                href={to}
                onClick={(e) => {
                  setMobileOpen(false)
                  if (to.startsWith('/#') && window.location.pathname === '/') {
                    e.preventDefault()
                    handleScrollToHash(to)
                  }
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  highlight
                    ? 'text-brand-600 hover:bg-brand-50 font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {highlight && <Sparkles className="h-4 w-4 text-brand-500" />}
                {label}
              </a>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-2">
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Sign In
              </Button>
            </Link>
            <Link to="/join" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full justify-start" leftIcon={<UserPlus className="h-4 w-4" />}>
                Join as an Individual
              </Button>
            </Link>
            <Link to="/register-org" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full justify-start" leftIcon={<Building2 className="h-4 w-4" />}>
                Register Organisation
              </Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
