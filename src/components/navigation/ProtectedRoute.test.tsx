import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useRole } from '@/context'
import { type RoleContextType } from '@/context/useRole'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('@/context', () => ({ useRole: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))

function makeRoleContext(overrides: Partial<RoleContextType> = {}): RoleContextType {
  return {
    currentRole: 'member',
    userProfile: {
      name: 'Test user',
      email: 'user@example.test',
      role: 'member',
      roleLabel: 'Member',
      organisation: 'Test organisation',
      orgType: 'Organisation',
    },
    isAuthenticated: false,
    isLoading: false,
    authError: null,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    roleMeta: {
      label: 'Member',
      description: 'Member',
      homePath: '/dashboard',
      badgeVariant: 'default',
    },
    navItems: [],
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
    toggleCollapse: vi.fn(),
    ...overrides,
  }
}

function renderProtectedOrgRoute() {
  return render(
    <MemoryRouter initialEntries={['/org']}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={['manager', 'org_admin']} />}>
          <Route path="/org" element={<p>Organisation records</p>} />
        </Route>
        <Route path="/login" element={<p>Sign-in page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('redirects an unauthenticated user to sign in', () => {
    vi.mocked(useRole).mockReturnValue(makeRoleContext())
    renderProtectedOrgRoute()

    expect(screen.getByText('Sign-in page')).toBeTruthy()
    expect(screen.queryByText('Organisation records')).toBeNull()
  })

  it('denies a signed-in member the organisation manager route', () => {
    vi.mocked(useRole).mockReturnValue(makeRoleContext({ isAuthenticated: true }))
    renderProtectedOrgRoute()

    expect(screen.getByText('Access not permitted')).toBeTruthy()
    expect(screen.queryByText('Organisation records')).toBeNull()
  })

  it('renders the route for an authorised profile role', () => {
    vi.mocked(useRole).mockReturnValue(makeRoleContext({
      currentRole: 'org_admin',
      isAuthenticated: true,
    }))
    renderProtectedOrgRoute()

    expect(screen.getByText('Organisation records')).toBeTruthy()
  })
})
