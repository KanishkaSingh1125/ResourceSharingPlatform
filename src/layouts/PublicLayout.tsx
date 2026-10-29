import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore Resources' },
  { to: '/join', label: 'Join as Individual' },
  { to: '/register-org', label: 'Register Organisation' },
] as const

const CURRENT_YEAR = new Date().getFullYear()

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold text-neutral-900">
              ShareSphere
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-100 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="border-t border-neutral-200 bg-white px-4 pb-4 pt-2 md:hidden">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block"
            >
              <Button variant="outline" size="sm" className="w-full">
                Sign in
              </Button>
            </Link>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-neutral-500">
              &copy; {CURRENT_YEAR} ShareSphere. Built for hackathon.
            </p>
            <div className="flex gap-6">
              <Link to="/explore" className="text-sm text-neutral-500 hover:text-neutral-700">
                Explore
              </Link>
              <Link to="/join" className="text-sm text-neutral-500 hover:text-neutral-700">
                Join
              </Link>
              <Link to="/register-org" className="text-sm text-neutral-500 hover:text-neutral-700">
                Register an organisation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
