import { Outlet } from 'react-router-dom'
import { PublicNavbar, PublicFooter } from '@/components/navigation'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
