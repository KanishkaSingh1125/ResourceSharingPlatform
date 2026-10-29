import {
  LayoutDashboard,
  Search,
  CalendarDays,
  ListChecks,
  Send,
  Package,
  Building2,
  Users,
  ShieldCheck,
  Bell,
  BarChart3,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  Settings,
  HelpCircle,
  Eye,
} from 'lucide-react'
import { type NavigationItem, type UserRole } from '@/types/navigation'

export const ROLE_DEFINITIONS: Record<
  UserRole,
  { label: string; description: string; homePath: string; badgeVariant: 'default' | 'primary' | 'warning' | 'error' }
> = {
  member: {
    label: 'Organisation Member',
    description: 'Discover resources, submit requests, and track bookings.',
    homePath: '/dashboard',
    badgeVariant: 'default',
  },
  manager: {
    label: 'Resource Manager',
    description: 'Manage listed equipment, approve bookings, and monitor condition.',
    homePath: '/org',
    badgeVariant: 'primary',
  },
  org_admin: {
    label: 'Organisation Administrator',
    description: 'Full oversight of organisation resources, members, and verification.',
    homePath: '/org',
    badgeVariant: 'warning',
  },
  platform_admin: {
    label: 'Platform Administrator',
    description: 'Global system oversight, verification queue, and compliance.',
    homePath: '/admin',
    badgeVariant: 'error',
  },
}

export const ALL_NAVIGATION_ITEMS: NavigationItem[] = [
  // ── Main section ─────────────────────────────────────────────
  {
    id: 'dashboard-member',
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ['member'],
    section: 'main',
    end: true,
  },
  {
    id: 'dashboard-org',
    label: 'Dashboard',
    to: '/org',
    icon: LayoutDashboard,
    roles: ['manager', 'org_admin'],
    section: 'main',
    end: true,
  },
  {
    id: 'dashboard-admin',
    label: 'Platform Dashboard',
    to: '/admin',
    icon: LayoutDashboard,
    roles: ['platform_admin'],
    section: 'main',
    end: true,
  },
  {
    id: 'discover',
    label: 'Discover Resources',
    to: '/dashboard/discover',
    icon: Search,
    roles: ['member', 'manager', 'org_admin'],
    section: 'main',
  },
  {
    id: 'bookings',
    label: 'My Bookings',
    to: '/dashboard/bookings',
    icon: CalendarDays,
    roles: ['member', 'manager', 'org_admin'],
    section: 'main',
  },
  {
    id: 'requests',
    label: 'My Requests',
    to: '/dashboard/requests',
    icon: Send,
    roles: ['member'],
    section: 'main',
  },
  {
    id: 'waiting-list',
    label: 'Waiting List',
    to: '/dashboard/waiting-list',
    icon: ListChecks,
    roles: ['member', 'manager', 'org_admin'],
    section: 'main',
  },

  // ── Resource & Management section ────────────────────────────
  {
    id: 'my-resources',
    label: 'My Resources',
    to: '/org/resources',
    icon: Package,
    roles: ['manager', 'org_admin'],
    section: 'management',
  },
  {
    id: 'booking-approvals',
    label: 'Booking Approvals',
    to: '/org/bookings',
    icon: ClipboardCheck,
    roles: ['manager', 'org_admin'],
    section: 'management',
  },
  {
    id: 'condition-reports',
    label: 'Condition Reports',
    to: '/org/condition-reports',
    icon: FileText,
    roles: ['manager'],
    section: 'management',
  },
  {
    id: 'incident-reports',
    label: 'Incident Reports',
    to: '/org/incidents',
    icon: AlertTriangle,
    roles: ['manager'],
    section: 'management',
  },
  {
    id: 'members',
    label: 'Members & Permissions',
    to: '/org/members',
    icon: Users,
    roles: ['org_admin'],
    section: 'management',
  },
  {
    id: 'org-verification',
    label: 'Organisation Verification',
    to: '/org/verification',
    icon: ShieldCheck,
    roles: ['org_admin'],
    badge: { text: 'Verified', variant: 'success' },
    section: 'management',
  },

  // ── Platform Admin Section ───────────────────────────────────
  {
    id: 'admin-verification',
    label: 'Verification Queue',
    to: '/admin/verification-queue',
    icon: ShieldCheck,
    roles: ['platform_admin'],
    badge: { text: '5 Pending', variant: 'warning' },
    section: 'management',
  },
  {
    id: 'admin-orgs',
    label: 'Manage Organisations',
    to: '/admin/organisations',
    icon: Building2,
    roles: ['platform_admin'],
    section: 'management',
  },
  {
    id: 'admin-users',
    label: 'User Management',
    to: '/admin/users',
    icon: Users,
    roles: ['platform_admin'],
    section: 'management',
  },
  {
    id: 'admin-monitoring',
    label: 'Resource Monitoring',
    to: '/admin/monitoring',
    icon: Eye,
    roles: ['platform_admin'],
    section: 'management',
  },
  {
    id: 'admin-incidents',
    label: 'Incident Management',
    to: '/admin/incidents',
    icon: AlertTriangle,
    roles: ['platform_admin'],
    section: 'management',
  },

  // ── Reports & Analytics section ──────────────────────────────
  {
    id: 'reports-analytics',
    label: 'Reports & Analytics',
    to: '/org/analytics',
    icon: BarChart3,
    roles: ['org_admin'],
    section: 'compliance',
    children: [
      { id: 'utilization', label: 'Resource Utilization', to: '/org/analytics#utilization' },
      { id: 'financial', label: 'Usage Hours & Credits', to: '/org/analytics#credits' },
    ],
  },
  {
    id: 'platform-analytics',
    label: 'Platform Analytics',
    to: '/admin/analytics',
    icon: BarChart3,
    roles: ['platform_admin'],
    section: 'compliance',
  },
  {
    id: 'audit-logs-org',
    label: 'Activity & Audit Logs',
    to: '/org/audit-logs',
    icon: Activity,
    roles: ['org_admin'],
    section: 'compliance',
  },
  {
    id: 'audit-logs-admin',
    label: 'Audit Logs',
    to: '/admin/audit-logs',
    icon: Activity,
    roles: ['platform_admin'],
    section: 'compliance',
  },

  // ── System section ───────────────────────────────────────────
  {
    id: 'notifications',
    label: 'Notifications',
    to: '/dashboard/notifications',
    icon: Bell,
    roles: ['member', 'manager'],
    badge: { text: '3', variant: 'primary' },
    section: 'system',
  },
  {
    id: 'settings-member',
    label: 'Profile & Settings',
    to: '/dashboard/settings',
    icon: Settings,
    roles: ['member'],
    section: 'system',
  },
  {
    id: 'settings-org',
    label: 'Settings',
    to: '/org/settings',
    icon: Settings,
    roles: ['org_admin'],
    section: 'system',
  },
  {
    id: 'settings-admin',
    label: 'Settings',
    to: '/admin/settings',
    icon: Settings,
    roles: ['platform_admin'],
    section: 'system',
  },
]

export const BOTTOM_UTILITY_ITEMS = [
  {
    id: 'help',
    label: 'Help & Support',
    to: '/help',
    icon: HelpCircle,
  },
]

/**
 * Filter navigation items strictly for the user's active role.
 * NOTE: UI filtering does not replace backend authorization or RLS policies.
 */
export function getNavigationForRole(role: UserRole): NavigationItem[] {
  return ALL_NAVIGATION_ITEMS.filter((item) => item.roles.includes(role))
}
