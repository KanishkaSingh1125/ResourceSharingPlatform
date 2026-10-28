import { Routes, Route } from 'react-router-dom'

// Layouts
import { PublicLayout, DashboardLayout, OrgLayout, AdminLayout } from '@/layouts'

// Common
import { ProtectedRoute } from '@/components/common'

// Public pages
import {
  HomePage,
  ExplorePage,
  JoinPage,
  RegisterOrgPage,
  LoginPage,
  VerifyEmailPage,
  ForgotPasswordPage,
  AuthCallbackPage,
  UpdatePasswordPage,
} from '@/pages/public'

// Dashboard pages
import {
  DashboardOverview,
  DiscoverPage,
  MyBookingsPage,
  NotificationsPage,
  UserSettingsPage,
  ProfilePage,
} from '@/pages/dashboard'

// Organisation pages
import {
  OrgWorkspace,
  OrgResourcesPage,
  OrgBookingsPage,
  OrgMembersPage,
  OrgAnalyticsPage,
  OrgSettingsPage,
} from '@/pages/org'

// Admin pages
import {
  AdminHome,
  AdminOrgsPage,
  AdminUsersPage,
  AdminAnalyticsPage,
  AdminReportsPage,
  AdminSettingsPage,
} from '@/pages/admin'

// Misc
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      {/* ── Public pages (no auth required) ──────────── */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="join" element={<JoinPage />} />
        <Route path="register-org" element={<RegisterOrgPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="update-password" element={<UpdatePasswordPage />} />
      </Route>

      {/* ── Auth callback (no layout chrome needed) ──── */}
      <Route path="auth/callback" element={<AuthCallbackPage />} />

      {/* ── User dashboard (protected) ───────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<UserSettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ── Organisation workspace (protected) ─────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="org" element={<OrgLayout />}>
          <Route index element={<OrgWorkspace />} />
          <Route path="resources" element={<OrgResourcesPage />} />
          <Route path="bookings" element={<OrgBookingsPage />} />
          <Route path="members" element={<OrgMembersPage />} />
          <Route path="analytics" element={<OrgAnalyticsPage />} />
          <Route path="settings" element={<OrgSettingsPage />} />
        </Route>
      </Route>

      {/* ── Admin panel (protected) ──────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="organisations" element={<AdminOrgsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* ── Catch-all ────────────────────────────────── */}
      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
