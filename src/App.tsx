import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProtectedRoute, PlatformAdminRoute } from '@/components/common'
import { PublicLayout, DashboardLayout, OrgLayout, AdminLayout } from '@/layouts'

const HomePage = lazy(() => import('@/pages/public/HomePage').then(module => ({ default: module.HomePage })))
const ExplorePage = lazy(() => import('@/pages/public/ExplorePage').then(module => ({ default: module.ExplorePage })))
const JoinPage = lazy(() => import('@/pages/public/JoinPage').then(module => ({ default: module.JoinPage })))
const RegisterOrgPage = lazy(() => import('@/pages/public/RegisterOrgPage').then(module => ({ default: module.RegisterOrgPage })))
const LoginPage = lazy(() => import('@/pages/public/LoginPage').then(module => ({ default: module.LoginPage })))
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })))
const AuthCallbackPage = lazy(() => import('@/pages/public/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage })))
const UpdatePasswordPage = lazy(() => import('@/pages/public/UpdatePasswordPage').then(module => ({ default: module.UpdatePasswordPage })))

const DashboardOverview = lazy(() => import('@/pages/dashboard/DashboardOverview').then(module => ({ default: module.DashboardOverview })))
const DiscoverPage = lazy(() => import('@/pages/dashboard/DiscoverPage').then(module => ({ default: module.DiscoverPage })))
const MyBookingsPage = lazy(() => import('@/pages/dashboard/MyBookingsPage').then(module => ({ default: module.MyBookingsPage })))
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage').then(module => ({ default: module.NotificationsPage })))
const UserSettingsPage = lazy(() => import('@/pages/dashboard/UserSettingsPage').then(module => ({ default: module.UserSettingsPage })))
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage').then(module => ({ default: module.ProfilePage })))
const TrustPassportPage = lazy(() => import('@/pages/dashboard/TrustPassportPage').then(module => ({ default: module.TrustPassportPage })))
const ActivityPage = lazy(() => import('@/pages/dashboard/ActivityPage').then(module => ({ default: module.ActivityPage })))
const SafetyPage = lazy(() => import('@/pages/dashboard/SafetyPage').then(module => ({ default: module.SafetyPage })))

const OrgWorkspace = lazy(() => import('@/pages/org/OrgWorkspace').then(module => ({ default: module.OrgWorkspace })))
const OrgResourcesPage = lazy(() => import('@/pages/org/OrgResourcesPage').then(module => ({ default: module.OrgResourcesPage })))
const OrgBookingsPage = lazy(() => import('@/pages/org/OrgBookingsPage').then(module => ({ default: module.OrgBookingsPage })))
const OrgMembersPage = lazy(() => import('@/pages/org/OrgMembersPage').then(module => ({ default: module.OrgMembersPage })))
const OrgAnalyticsPage = lazy(() => import('@/pages/org/OrgAnalyticsPage').then(module => ({ default: module.OrgAnalyticsPage })))
const OrgSettingsPage = lazy(() => import('@/pages/org/OrgSettingsPage').then(module => ({ default: module.OrgSettingsPage })))
const OrgSharedCredentialsPage = lazy(() => import('@/pages/org/OrgSharedCredentialsPage').then(module => ({ default: module.OrgSharedCredentialsPage })))
const OrgIncidentsPage = lazy(() => import('@/pages/org/OrgIncidentsPage').then(module => ({ default: module.OrgIncidentsPage })))
const OrgCheckinPage = lazy(() => import('@/pages/org/OrgCheckinPage').then(module => ({ default: module.OrgCheckinPage })))

const AdminHome = lazy(() => import('@/pages/admin/AdminHome').then(module => ({ default: module.AdminHome })))
const AdminOrgsPage = lazy(() => import('@/pages/admin/AdminOrgsPage').then(module => ({ default: module.AdminOrgsPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(module => ({ default: module.AdminUsersPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then(module => ({ default: module.AdminAnalyticsPage })))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage').then(module => ({ default: module.AdminReportsPage })))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then(module => ({ default: module.AdminSettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })))

export function App() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage label="Loading page…" />}>
      <Routes>
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

        <Route path="auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="bookings" element={<MyBookingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="trust" element={<TrustPassportPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="safety" element={<SafetyPage />} />
            <Route path="settings" element={<UserSettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="org" element={<OrgLayout />}>
            <Route index element={<OrgWorkspace />} />
            <Route path="resources" element={<OrgResourcesPage />} />
            <Route path="bookings" element={<OrgBookingsPage />} />
            <Route path="members" element={<OrgMembersPage />} />
            <Route path="analytics" element={<OrgAnalyticsPage />} />
            <Route path="settings" element={<OrgSettingsPage />} />
            <Route path="credentials" element={<OrgSharedCredentialsPage />} />
            <Route path="incidents" element={<OrgIncidentsPage />} />
            <Route path="check-in" element={<OrgCheckinPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<PlatformAdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              <Route path="organisations" element={<AdminOrgsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
