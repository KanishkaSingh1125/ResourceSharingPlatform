import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

export function PlatformAdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage label="Checking administrator access…" />
  if (!user) return <Navigate to="/login" replace />
  if (user.app_metadata.role !== 'platform_admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
