import { type ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Alert, Button, Card } from '@/components/ui'
import { useRole } from '@/context'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ROLE_DEFINITIONS } from '@/config/navigation'
import { type UserRole } from '@/types/navigation'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authError, currentRole, refreshProfile } = useRole()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <Alert variant="error" title="Authentication is not configured">
          Connect Supabase Auth and configure its public URL and anon key to access protected
          ShareSphere pages. Local demo state does not grant account access.
        </Alert>
        <Link className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline" to="/login">
          Go to sign in
        </Link>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10" aria-live="polite">
        <Card><p className="text-sm text-neutral-600">Verifying your ShareSphere session…</p></Card>
      </main>
    )
  }

  if (!isAuthenticated) {
    if (authError && authError !== 'Sign in before accessing your profile.') {
      return (
        <main className="mx-auto max-w-2xl p-6 sm:p-10 space-y-4">
          <Alert variant="error" title="Account verification failed">{authError}</Alert>
          <Button variant="outline" onClick={() => void refreshProfile()}>Retry</Button>
          <Link className="ml-4 text-sm font-medium text-brand-700 hover:underline" to="/login">
            Sign in
          </Link>
        </main>
      )
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return (
      <main className="mx-auto max-w-2xl p-6 sm:p-10">
        <Alert variant="error" title="Access not permitted">
          Your verified account role does not grant access to this area.
        </Alert>
        <Link
          className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
          to={ROLE_DEFINITIONS[currentRole].homePath}
        >
          Return to your dashboard
        </Link>
      </main>
    )
  }

  return children ? children : <Outlet />
}
