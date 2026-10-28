import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar, MobileNavigation, DashboardHeader } from '@/components/navigation'
import { useRole } from '@/context'

export function OrgLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isCollapsed, currentRole, setRole } = useRole()
  const navigate = useNavigate()

  // Ensure role is at least manager or org_admin when entering organisation workspace
  useEffect(() => {
    if (currentRole === 'member') {
      setRole('org_admin')
    }
  }, [currentRole, setRole])

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      {/* Desktop Sidebar (Fixed & Collapsible) */}
      <Sidebar />

      {/* Mobile Drawer Navigation */}
      <MobileNavigation
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <DashboardHeader
          title="Organisation Workspace"
          onToggleSidebar={() => setMobileOpen(true)}
          onSearchClick={() => navigate('/org/resources')}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
