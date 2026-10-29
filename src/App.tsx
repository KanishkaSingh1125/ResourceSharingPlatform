import { Routes, Route } from 'react-router-dom'

// Layouts
import { PublicLayout, DashboardLayout, OrgLayout, AdminLayout } from '@/layouts'

// Public pages
import {
  HomePage,
  ExplorePage,
  JoinPage,
  RegisterOrgPage,
  LoginPage,
  DesignSystemPage,
  HelpSupportPage,
} from '@/pages/public'

// Dashboard pages
import {
  DashboardOverview,
  DiscoverPage,
  ResourceDetailPage,
  MyBookingsPage,
  BookingDetailPage,
  MyRequestsPage,
  WaitingListPage,
  NotificationsPage,
  UserSettingsPage,
} from '@/pages/dashboard'

// Organisation pages
import {
  OrgWorkspace,
  OrgResourcesPage,
  OrgBookingsPage,
  OrgMembersPage,
  OrgAnalyticsPage,
  OrgSettingsPage,
  ConditionReportsPage,
  OrgIncidentsPage,
  OrgVerificationPage,
  OrgAuditLogsPage,
} from '@/pages/org'

// Admin pages
import {
  AdminHome,
  AdminOrgsPage,
  AdminUsersPage,
  AdminAnalyticsPage,
  AdminReportsPage,
  AdminSettingsPage,
  AdminVerificationQueuePage,
  AdminMonitoringPage,
  AdminIncidentsPage,
  AdminAuditLogsPage,
} from '@/pages/admin'

// Misc
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      {/* ── Public pages ─────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="join" element={<JoinPage />} />
        <Route path="register-org" element={<RegisterOrgPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="design-system" element={<DesignSystemPage />} />
        <Route path="help" element={<HelpSupportPage />} />
      </Route>

      {/* ── User dashboard ───────────────────────────── */}
      <Route path="dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="resources/:id" element={<ResourceDetailPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="requests" element={<MyRequestsPage />} />
        <Route path="waiting-list" element={<WaitingListPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<UserSettingsPage />} />
      </Route>

      {/* ── Organisation workspace ───────────────────── */}
      <Route path="org" element={<OrgLayout />}>
        <Route index element={<OrgWorkspace />} />
        <Route path="resources" element={<OrgResourcesPage />} />
        <Route path="bookings" element={<OrgBookingsPage />} />
        <Route path="condition-reports" element={<ConditionReportsPage />} />
        <Route path="incidents" element={<OrgIncidentsPage />} />
        <Route path="members" element={<OrgMembersPage />} />
        <Route path="verification" element={<OrgVerificationPage />} />
        <Route path="analytics" element={<OrgAnalyticsPage />} />
        <Route path="audit-logs" element={<OrgAuditLogsPage />} />
        <Route path="settings" element={<OrgSettingsPage />} />
      </Route>

      {/* ── Admin panel ──────────────────────────────── */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="verification-queue" element={<AdminVerificationQueuePage />} />
        <Route path="organisations" element={<AdminOrgsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="incidents" element={<AdminIncidentsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* ── Catch-all ────────────────────────────────── */}
      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
