# ShareSphere — Resource Sharing Platform

> A hackathon project that connects community organisations with people who need
> access to shared resources (equipment, spaces, vehicles, tools, and more).

---

## ✨ What is ShareSphere?

ShareSphere is a web platform where:

- **Organisations** register and list their available resources.
- **Users** browse, discover, and request bookings for those resources.
- **AI matching** helps users find the best-fit resource for their needs.
- **Admins** manage the platform, approve organisations, and handle reports.

---

## 🗂️ Folder Structure

```
ResourceSharingPlatform/
├── public/                   Static assets (favicon, images)
├── src/
│   ├── components/
│   │   ├── common/           Shared utility components (LoadingSpinner, ProtectedRoute…)
│   │   ├── layout/           Layout building blocks (PageHeader, Sidebar…)
│   │   └── ui/               Low-level UI primitives (Button, Card, Badge)
│   ├── features/             Feature slices — each folder owns its hooks & services
│   │   ├── organisations/
│   │   ├── resources/
│   │   ├── bookings/
│   │   ├── eligibility/
│   │   ├── incidents/
│   │   └── ai-matching/
│   ├── layouts/              Full-page layout wrappers (PublicLayout, DashboardLayout…)
│   ├── lib/
│   │   ├── supabase.ts       Supabase client (reads from .env.local)
│   │   ├── AuthContext.tsx    Auth provider + useAuth hook
│   │   └── utils.ts          Utility helpers (cn, formatDate, slugify…)
│   ├── pages/                Route-level page components
│   │   ├── public/           HomePage, ExplorePage, LoginPage, JoinPage, VerifyEmailPage,
│   │   │                     ForgotPasswordPage, AuthCallbackPage, UpdatePasswordPage
│   │   ├── dashboard/        User dashboard pages (Overview, Profile, Settings…)
│   │   ├── org/              Organisation workspace pages
│   │   └── admin/            Admin panel pages
│   ├── types/
│   │   └── index.ts          Shared TypeScript types
│   ├── App.tsx               Root router
│   ├── main.tsx              React entry point
│   └── index.css             Global styles + design tokens (Tailwind v4)
├── supabase/
│   ├── migrations/           SQL migration files (one per schema change)
│   │   └── 20261028000001_create_profiles.sql
│   ├── seed.sql              Example data for local development
│   └── config.toml           Local Supabase stack configuration
├── .env.example              Environment variable template (no real secrets)
├── .env.local                Your local credentials (git-ignored)
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ResourceSharingPlatform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings → API**
4. Copy **Project URL** → `VITE_SUPABASE_URL`
5. Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`

> ⚠️ Never use the `service_role` key in frontend code or `VITE_` variables.

### 4. Apply database migrations

The ordered SQL files in `supabase/migrations/` define the complete database
schema. Apply the full sequence with the Supabase migration tooling; do not
apply only `20261028000001_create_profiles.sql` or paste a subset into the SQL
Editor.

Before applying migrations to an existing database, inspect its migration
history and reconcile any migrations previously applied manually. Do not edit
an applied migration; use a new forward-only migration for corrections.

`supabase db reset` is destructive. Use it only with a disposable local
database, never with an existing, shared, or remote database.

Platform verification reviewers must have the server-managed JWT claim
`app_metadata.role = "platform_admin"`; do not place reviewer privileges in
user-editable metadata.

### 5. Configure Supabase Auth settings

In the Supabase Dashboard → **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:5173` (or your deployed URL) |
| **Redirect URLs** | `http://localhost:5173/auth/callback` |

In **Authentication → Email**:
- Enable **Confirm email** (recommended for production)
- For local development, you can disable email confirmation for faster testing

In **Authentication → Email Templates** (optional):
- The confirmation email will include a link to `{site_url}/auth/callback`
- The recovery email will include a link to `{site_url}/auth/callback?type=recovery`

### 6. Start the development server

```bash
npm run dev
```

The app is available at **http://localhost:5173**.

---

## 🔐 Authentication Routes

| Route | Purpose |
|-------|---------|
| `/login` | Sign in with email + password |
| `/join` | Create a new individual account |
| `/verify-email` | Verification-pending screen (with resend) |
| `/forgot-password` | Request a password reset email |
| `/update-password` | Set a new password (after recovery link) |
| `/auth/callback` | Handles Supabase email confirmation & recovery callbacks |
| `/dashboard/profile` | View and edit your profile (protected) |

### Protected Routes

The following routes require authentication and will redirect to `/login`:
- `/dashboard/*`
- `/org/*`
- `/admin/*`

---

## 📜 Available Scripts

| Command           | Description                            |
|-------------------|----------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR         |
| `npm run build`   | Type-check + production build          |
| `npm run preview` | Preview the production build locally   |
| `npm run lint`    | Run Oxlint static analysis             |

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19 + TypeScript 7 + Vite 8    |
| Styling     | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Routing     | React Router v7                     |
| Backend     | Supabase (Postgres + Auth + Storage)|
| Charts      | Recharts                            |
| Icons       | Lucide React                        |
| QR Codes    | qrcode.react                        |
| Linting     | Oxlint                              |

---

## 📊 Implementation Status

The statuses below describe the current code, not a claim that the remote or
local database has these migrations applied. The production build is checked;
no PostgreSQL execution or live backend workflow has been verified here.

| Area | Audit status | Current boundary |
|---|---|---|
| Authentication and protected routes | Partially implemented | Supabase auth flows exist; runtime/session-expiry behavior is not integration-tested. |
| Resource discovery and organisation registration | Partially implemented | Search, draft creation/publication, registration, and workspace views use existing services/RLS; editing, schedule management, and verification-document upload are incomplete. |
| Bookings and waitlist | Partially implemented | Request, cancellation, manager approval, waitlist claim/withdraw, one-time QR issuance/consumption, and condition-report pages use existing RPCs; runtime workflows remain unverified. |
| Trust Passport and consent | Partially implemented | Self-declared/reviewed credentials, explicit recipient/purpose/attribute/expiry consent, revocation, and recipient-scoped viewing are wired; no issuer integration or credential upload/review UI exists. |
| Notifications | Partially implemented | Persistent inbox, read state, filtering, unread count, and preferences are wired; event coverage is limited to backend triggers already present, and email delivery is absent. |
| Activity and audit history | Partially implemented | Read-only actor-scoped history is shown; the schema has no uniform outcome or integrity-proof fields and does not provide organisation-wide audit access. |
| Organisation analytics | Partially implemented | Authorised backend aggregation and measured-vs-unavailable presentation are wired; platform-wide analytics and defensible savings estimates are absent. |
| Incidents and safety holds | Partially implemented | Users can submit incident reports at `/dashboard/safety`; organisation managers can review status/history and place or release holds at `/org/incidents`. Evidence upload and runtime authorization remain unverified. |
| QR check-in/out and condition reports | Partially implemented | Bookers issue one-time QR tokens and submit condition reports from booking details; managers consume scanned tokens at `/org/check-in`. Camera-based scanning, checklist management UI, and runtime authorization remain unverified. |
| Platform administration | Blocked by backend | The UI is gated by the server-managed `app_metadata.role = 'platform_admin'` claim, but global admin read/list workflows are not implemented. |
| Database runtime/security verification | Blocked by environment | Migration status is unknown; no disposable local Postgres/Supabase instance is available for execution or RLS tests. |

---

## 🧪 Manual Testing Checklist

After applying the migration and configuring auth:

| # | Test | Steps |
|---|------|-------|
| 1 | **Register** | Go to `/join`, fill in name/email/password, submit |
| 2 | **Email verification** | Check inbox, click verification link → redirects to dashboard |
| 3 | **Resend verification** | On `/verify-email`, click "Resend" (observe 60s cooldown) |
| 4 | **Valid login** | Go to `/login`, enter valid credentials → redirects to `/dashboard` |
| 5 | **Invalid login** | Enter wrong password → shows "Invalid email or password" |
| 6 | **Logout** | Click "Sign out" in dashboard sidebar → returns to `/login` |
| 7 | **Session restoration** | Log in, refresh page → stays on dashboard |
| 8 | **Password reset request** | Go to `/forgot-password`, enter email → shows "Check your email" |
| 9 | **Password update** | Click recovery link → land on `/update-password` → set new password |
| 10 | **Protected route blocking** | Visit `/dashboard` while logged out → redirected to `/login` |
| 11 | **Redirect preservation** | Visit `/dashboard/profile` while logged out → after login, returns to profile |
| 12 | **Profile edit** | On `/dashboard/profile`, change display name → saves to database |
| 13 | **Protected field test** | In Supabase SQL Editor, try `UPDATE profiles SET account_status = 'admin'` as authenticated user → should fail |
| 14 | **Missing env vars** | Remove `.env.local` → app shows clear error message |
| 15 | **Network error** | Disable network → login shows "Network error" message |

---

## Backend Workflow Integration

Migrations `20261028000004_incidents_and_safety_holds.sql` through `20261028000007_matching_and_utilization.sql` add the first backend workflows; `20261029000008_backend_audit_corrections.sql` through `20261029000014_forward_only_database_corrections.sql` contain subsequent corrections and workflows. Apply the sequence in timestamp order. This workspace has no running local database or accessible migration ledger, so the applied status of any migration is unknown. The committed version of migration `00003` used invalid `USING` clauses on INSERT policies; its current working-tree edit drops those policies. Migration `00014` repeats the policy removal and revokes authenticated write privileges without rewriting migration history. Reconcile the migration ledger before applying migrations to an existing database. Apply migrations to a disposable/local Supabase project first; never use a production project for initial verification. With Supabase CLI and Docker running, use `supabase start` and `supabase migration up --local` only after confirming the local target. Do not use `supabase db reset` for this workflow.

Migration `20261029000009_credential_verification_guard.sql` prevents authenticated users from self-marking newly submitted credentials as verified and removes their direct credential update permission. Migration `20261029000011_credential_review_workflow.sql` adds the authorised review RPC and verification history; there is no issuer integration. Existing verified records without reviewer provenance are invalidated and recorded for re-review. Do not rely on legacy verification flags until an authorised reviewer rechecks them.

All RPC failures return `{ success: false, error: string }` unless noted below. Table reads return `{ data, error }`. User and organisation identifiers are derived or checked in PostgreSQL; do not pass an actor ID, role, eligibility result, booking status, or FairShare score from the UI.

### Incidents And Safety Holds

- `reportIncident({ resource_id, booking_id?, severity, title, description })` returns `{ data: Incident | null, error }`. Reporting is available to authenticated users; a supplied booking must match the resource and belong to the reporter or be visible to resource staff. Resource managers receive notifications.
- `updateIncidentStatus(incidentId, status, resolution?)` returns `{ data: Incident | null, error }`. `assignIncident(incidentId, assigneeId, reason?)` returns the `transition_incident` RPC result (`{ success, incident_id, status, error? }`), not an `Incident` row. Only owner/admin/manager members of the resource-owning organisation can review, assign, resolve, or close incidents. Resolution/closure requires a reason.
- `getIncidentHistory(incidentId)` returns append-only action history. `addIncidentEvidence(...)` registers metadata; prefer `uploadIncidentEvidence(incidentId, file)` to upload to the private `incident-evidence` bucket and register it in one client workflow. Evidence is limited to 10 MB and JPEG, PNG, WebP, or PDF.
- `placeSafetyHold({ resource_id, reason, expires_at? })` creates a hold; `releaseSafetyHold(holdId, reason)` removes it. Only resource managers may do either. A hold cancels future overlapping pending/confirmed bookings, preserves already-started bookings, logs the action, and notifies affected bookers. New bookings and QR check-in/out are rejected while the hold is active.

### QR Check-In/Out

- `issueBookingQrToken(bookingId, 'check_in' | 'check_out')` returns `{ token, expires_at, error }`. The token is a random one-time bearer secret; it expires after 15 minutes and only its SHA-256 hash is stored. The QR payload should contain only this token, not booking or personal data.
- `consumeBookingQrToken(token, resourceId, eventType, notes?)` returns an RPC result. It checks the authenticated actor, booking, resource, time window, current status, hold, and token state under locks. A token can only be consumed once. The actor must be the booker or resource staff.
- The old `recordCheckin` wrapper is deprecated and intentionally returns an error; use the issue/scan/consume workflow. `getCheckinEvents(bookingId)` remains the history read.
- Bookers issue and display QR tokens in the check-in/condition section of a confirmed booking. Resource managers enter the token decoded by an approved scanner at `/org/check-in`; the browser does not request camera access or implement QR decoding.

### Condition Reports

- `getConditionChecklist(resourceId)` reads active checklist items. Resource-owning managers configure items with `saveConditionChecklistItem(...)`; use `is_active: false` to retire an item rather than deleting submitted history.
- `submitConditionReport(report: ConditionReportInput)` returns `{ data: ConditionReport | null, error, incident_id }`. The checklist is a key/value object; values are `excellent`, `good`, `fair`, `poor`, `damaged`, or `not_applicable`. Reports are append-only. Post-use requires a completed booking, check-in, checkout, and a pre-use report. Any deterioration on the ordered `excellent < good < fair < poor < damaged` scale, for the overall rating or a shared checklist item, or a damage flag creates a linked incident.
- `uploadConditionEvidence(reportId, bookingId, file)` uploads an image to the private `condition-evidence` bucket and registers metadata. Use Supabase `createSignedUrl` for short-lived display URLs; do not expose object paths publicly. Only booking participants and owning managers can view evidence.

### Waitlist And FairShare

- `joinWaitingList({ resource_id, starts_at, ends_at })` returns `{ data: WaitingListEntry | null, error }`. Do not send `org_id`; it is selected from the authenticated user's eligible memberships. Duplicate active requests are rejected.
- `getMyWaitingList()` lists the user's entries. `claimWaitlistOffer(entryId)` atomically creates the booking if the offer is current and eligibility/availability still pass. Offers expire after 30 minutes. `leaveWaitingList(entryId)` withdraws without deleting history.
- `createBooking(input)` remains the ordinary booking path; eligibility, holds, availability, conflicts, capacity, and the configured weekly booking cap are rechecked in PostgreSQL. FairShare prior usage counts completed bookings with recorded check-in and checkout. Direct booking table writes are revoked. Cancellation, rejection, and rescheduling release the old slot to an eligible waitlist member. `rescheduleBooking(bookingId, startsAt, endsAt)` performs the replacement atomically.
- Managers can request allocation for a newly opened slot with `allocateWaitlistSlot({ resource_id, starts_at, ends_at })`. `prioritizeWaitlistEntry(entryId, reason)` is a logged manager override. Allocation decisions are readable to the entry owner and resource managers.

### Credentials And Trust

- `addCredential(...)` creates a self-reported, unverified credential. Migration `20261029000009_credential_verification_guard.sql` prevents authenticated users from setting their own verification state.
- `reviewCredential({ credential_id, verified, verification_source?, reason })` calls a database RPC restricted to managers/admins/owners of an organisation the credential owner belongs to. `getCredentialVerificationHistory(credentialId)` reads append-only review history.
- Existing verified credentials without reviewer provenance are invalidated with a history entry by migration 00011. Re-review is required before they can satisfy eligibility.
- This is not independent issuer verification. No issuer integration exists; do not describe credentials as independently validated.
- `grantCredentialShareConsent({ recipient_org_id, purpose, allowed_attributes, expires_at })`, `revokeCredentialShareConsent(consentId, reason)`, `getMyCredentialShareConsents()`, `getCredentialShareConsentHistory(consentId)`, and `getConsentedCredentials(consentId, purpose)` use migrations 00012 and the recipient-scoped RPC. Only the credential owner grants/revokes; only approved recipient-organisation managers can disclose, with matching purpose and unexpired, unrevoked consent. Only the allow-listed credential attributes are returned; document URLs are never shared. This is consent-based credential disclosure, not external issuer validation.

### Notifications And Audit

- Migrations 00004/00008 generate incident, safety-hold, waitlist, and condition-discrepancy notifications. Migration `20261029000010_booking_notifications.sql` adds idempotent booking-created/confirmed/rejected/cancelled notifications from database events. Users can read their own notifications and update only `is_read`; direct client insertion is disabled.
- `getMyNotifications({ page?, pageSize? })` returns a page, exact count, and `hasMore`; `getMyUnreadNotificationCount()` returns an authenticated-user-only unread count. `getMyNotificationPreferences()` and `updateMyNotificationPreferences(enabledTypes)` manage the user's allow-listed event preferences through migration 00013. Disabled notifications are skipped by the database trigger. No email delivery is implemented.
- Audit entries are written by trusted database workflows. Audit immutability and scope still depend on the applied database policies; these migrations have not been runtime-verified.
- The website exposes a persistent inbox, per-account unread count, read/unread toggles, type filters, and supported notification preferences. Some notification types in the schema do not yet have an event-producing workflow.
- The activity page queries only rows attributed to the signed-in actor and does not render private audit metadata. It explicitly does not claim that the log is tamper-proof or that outcomes are stored uniformly.

### Matching And Utilisation

- `findResourceMatches({ starts_at, ends_at, minimum_capacity?, location?, resource_type?, maximum_cost?, limit? })` returns `{ data: ResourceMatchResult[], error }`. Each result includes `matches` and explicit `reasons`. Only published resources of approved organisations are candidates; eligibility, capacity, location, resource type, booking schedule/notice/duration limits, maintenance, holds, active waitlist offers, booking conflicts, and weekly FairShare cap are checked server-side using the booking slot validator.
- The schema has no resource cost field. If `maximum_cost` is supplied, results explicitly fail with a cost-not-configured reason; no resource is represented as meeting that constraint.
- `getResourceUtilization({ resource_id, from, to })` returns `ResourceUtilization`, including `availability_schedule_configured`. `booked_minutes` and `actual_usage_minutes` are separate; actual usage requires completed bookings with check-in and checkout and is clipped to the reporting window. Booked and actual minutes are both clipped to scheduled time after subtracting maintenance and safety holds. If no availability windows are configured, booking treats the resource as unrestricted and utilization uses the reporting window as its schedule. `underused` is null until at least 10 scheduled periods, 5 completed usage samples, and 14 days of data are available. Managers only.
- `getOrgSharingAnalytics(orgId, from, to)` returns organisation-scoped resource counts, booking outcomes, verified usage, and measured utilization through migration 00013. Only organisation managers can call it. Savings are unavailable (`null`) because the schema has no defensible resource-cost input. Platform-wide analytics remain unimplemented because this schema has no verified platform-administrator claim/role.
- No external AI service, natural-language parser, or image-damage detection is implemented. No AI/API keys are needed or sent to the browser.

### Verification

This repository currently has no automated test script or database test harness. `npm run build` and `npm run lint` are available. Before demoing against local Supabase, verify at minimum: non-staff incident resolution fails; a hold cancels future overlapping bookings and blocks a new booking; QR replay and expired tokens fail; resource-owner staff can read submitted reports while unrelated users cannot; two concurrent claims cannot create overlapping bookings; concurrent bookings across resources cannot exceed the weekly cap; an expired offer can be reallocated; an `excellent` pre-use to `good` post-use report creates a discrepancy; self-reported credentials remain unverified; unauthorised credential reviews and cross-organisation disclosures fail; expired/revoked consent fails; booking notifications deduplicate per recipient and preferences suppress disabled types; and matching never marks an ineligible, held, maintained, offered, occupied, too-soon, over-duration, or weekly-capped request as a match. These SQL workflows have not been executed in this environment because Supabase CLI and `psql` are unavailable, and no disposable local database is running.

### Demo And Deployment Readiness

No demo rows are inserted by this project workflow. Once a reviewed demo database
is prepared, a reliable website walkthrough is: sign in with a prepared user;
search an approved organisation's published resource; submit a booking; confirm
it as an authorised organisation manager; review the resulting notification and
booking history; submit a real incident report and review it as an organisation
manager; grant a recipient-specific credential consent; view only the permitted
attributes as a recipient manager; then inspect organisation analytics for a
date range with actual booking data. During the scheduled booking window, test
pre-use reporting and issue a one-time QR token; have an authorised manager
decode it with an approved scanner and consume it at `/org/check-in`; after
checkout, test post-use reporting. These flows require a disposable database
with matching policies and have not yet been runtime-verified. Evidence upload
and platform-admin review are not yet complete website demos.

For deployment, build with `npm run build` and configure only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as frontend environment
variables. The anon key is public and depends on RLS; never put a `service_role`
or other private key in a `VITE_` variable or browser bundle. Configure the
Supabase Auth site URL/redirect URLs and allowed origins for the deployed
website. The host must rewrite unknown paths to `index.html` for React Router
deep links; this repository does not select or configure a hosting provider.
No deployment was performed.

---

## 🧑‍💻 Contributing (Hackathon Team)

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Push and open a pull request against `main`

> **Do not commit** `.env.local` — it is git-ignored. Only commit `.env.example` with
> placeholder variable names.

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
