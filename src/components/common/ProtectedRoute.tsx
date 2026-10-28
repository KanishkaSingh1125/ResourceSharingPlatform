/**
 * Route guard that redirects unauthenticated users to /login.
 * Preserves the intended destination as a `redirect` query param
 * (only for internal paths — external URLs are rejected).
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullPage label="Checking authentication…" />
  }

  if (!user) {
    // Build a safe redirect param (internal paths only)
    const intended = location.pathname + location.search
    const redirectParam = intended && intended !== '/' ? `?redirect=${encodeURIComponent(intended)}` : ''
    return <Navigate to={`/login${redirectParam}`} replace />
  }

  return <Outlet />
}
