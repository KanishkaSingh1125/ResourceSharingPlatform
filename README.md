# ShareSphere — Resource Sharing Platform

> A hackathon project that connects community organisations with people who need
> access to shared resources (equipment, spaces, vehicles, tools, and more).

---

## ✨ What is ShareSphere?

ShareSphere is a web platform where:

- **Organisations** can manage resource listings through the supported backend operations.
- **Users** browse, discover, and request bookings for those resources.
- **The alternative finder** helps users explore suitable resources; its fallback is deterministic,
  not AI-generated.
- **Admins** manage the platform, approve organisations, and handle reports.

---

## 🗂️ Folder Structure

```
ResourceSharingPlatform/
├── public/                   Static assets (favicon, images)
├── src/
│   ├── components/
│   │   ├── common/           Shared utility components (Spinner, ErrorBoundary…)
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
│   │   ├── supabase.ts       Supabase client (reads from .env)
│   │   └── utils.ts          Utility helpers (cn, formatDate, slugify…)
│   ├── pages/                Route-level page components
│   │   ├── public/           HomePage, ExplorePage, LoginPage, JoinPage, RegisterOrgPage
│   │   ├── dashboard/        User dashboard pages
│   │   ├── org/              Organisation workspace pages
│   │   └── admin/            Admin panel pages
│   ├── types/
│   │   └── index.ts          Shared TypeScript types
│   ├── App.tsx               Root router
│   ├── main.tsx              React entry point
│   └── index.css             Global styles + design tokens (Tailwind v4)
├── supabase/
│   ├── migrations/           Migration directory (no schema migrations are included)
│   ├── seed.sql              Example data for local development
│   └── config.toml           Local Supabase stack configuration
├── .env.example              Environment variable template (no real secrets)
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

Create a local `.env.local` file from `.env.example` and fill in your Supabase project URL and anon key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The Supabase anon key is intended for browser use, but database access must be protected by
correctly configured row-level security (RLS). Never put a service-role key or private AI provider
key in a `VITE_` variable. No database schema migrations are included in this repository, so
`supabase db reset` cannot configure a working backend by itself.

### 4. (Optional) Start local Supabase

> Requires [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker Desktop.

```bash
supabase start
```

### 5. Start the development server

```bash
npm run dev
```

The app is available at **http://localhost:5173**.

---

## 📜 Available Scripts

| Command           | Description                            |
|-------------------|----------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR         |
| `npm run build`   | Type-check + production build          |
| `npm run preview` | Preview the production build locally   |
| `npm run lint`    | Run Oxlint static analysis             |
| `npm test`        | Run the Vitest frontend test suite      |

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

## Backend and feature status

The application includes Supabase-backed frontend service flows, but this repository does not
include database schema migrations or deployable backend functions. Configure the matching
schema, RPCs, authentication settings, storage policies, and RLS policies in the target Supabase
project before relying on backend-dependent features. Client-side checks are not an authorization
boundary.

## Booking workflow status

Booking lists, details, availability queries, submissions, cancellations, review decisions, and no-show updates use the Supabase `bookings` table and display returned records rather than local booking seeds. The create form reuses the same request ID on a retry to avoid duplicate inserts.

Availability slots are derived from resource operating hours and overlapping booking rows returned by Supabase. A server-side exclusion constraint or atomic booking RPC is still needed to prevent two simultaneous requests from claiming the same slot. The database must also enforce eligibility, organisation roles, status transitions, and booking policies; client checks are not an authorization boundary.

Rescheduling is intentionally unavailable until its backend contract and persistence fields are defined. The schema currently has no proposed replacement-time or reschedule-reason fields. The interface does not mark requests as confirmed unless the backend returns an approved/confirmed status.

## Waiting-list and FairShare integration

The dashboard waiting-list page reads and changes persisted records through these authenticated Supabase RPCs:

- `get_my_waitlist_entries()` returns the current user's records as an array of rows.
- `join_waitlist(p_resource_id, p_start_time, p_end_time, p_purpose, p_idempotency_key)` returns the persisted entry. The backend validates eligibility and availability, deduplicates retries, and invokes the FairShare Allocation Engine.
- `leave_waitlist(p_waitlist_id)` returns the updated entry.
- `respond_to_waitlist_offer(p_waitlist_id, p_decision)` accepts `accept` or `decline` and returns the updated entry. The backend rejects expired or superseded offers.
- `get_waitlist_alternatives(p_waitlist_id)` returns resources and time slots selected by the allocation service.

Entry RPC results use snake-case fields: `id`, `resource_id`, `resource_title`, `start_time`, `end_time`, `purpose`, `status`, `queue_position`, `queue_position_visible`, `offer_expires_at`, `outcome_reason`, `allocation_explanation`, and `updated_at`. Supported statuses are `waiting`, `awaiting_decision`, `offered`, `accepted`, `declined`, `expired`, `withdrawn`, `allocated`, and `not_allocated`. Queue positions are supplied only when policy permits; the client never calculates a position or allocation outcome. Alternative results contain `resource_id`, `resource_title`, `start_time`, `end_time`, and optional `explanation`.

The RPCs and their database policies/functions must be deployed before this interface can be used. They must enforce authentication, ownership, eligibility, allocation policy, atomic queue changes, duplicate handling, offer expiry, and status transitions server-side. Status-change notifications should be persisted by the backend; while the waiting-list page is open, it refreshes the records every 30 seconds and displays a toast when a status changes. Network failures are surfaced without presenting an unconfirmed state, and offer races trigger a refresh so the page shows the current persisted record.

## Handover, condition reports, incidents, and alternatives

Booking reads deliberately omit `qr_pass_code`; the client does not display or encode booking details in a QR payload. Secure check-in/out is disabled until the backend exposes an authenticated, one-time credential validation-and-consumption operation. The existing direct booking update helpers reject check-in/out rather than treating a booking ID or scan as authorisation.

Condition and incident reports use the existing `reports_and_incidents` table and are read or written only through an authenticated Supabase session. Report visibility, inserts, and manager review must be restricted by deployed row-level security policies. Condition details and incident category/date are serialized into the existing description column because the current table has no dedicated fields. Image evidence upload is disabled until a private Storage bucket and participant/manager policies are configured; public image URLs are not stored.

The alternative finder currently provides a deterministic fallback over the verified organisation and resource catalogue, not AI recommendations. It displays no utilisation claims when a usage feed is unavailable, and only reports time-window availability after a backend availability check. Recommendations do not authorize a booking or bypass the normal eligibility and approval workflow.

## Notifications and organisation dashboard

The notification centre and header badge read the authenticated user's persisted rows from the
`notifications` table. Read-state updates are scoped to that user, and notification links are
shown only for internal application paths. The table's row-level security policies must enforce
the same user scope. The frontend does not generate sample notifications. Notification-category
preferences are not supported because this schema has no preference table or API.

The organisation workspace reads resources, bookings, and unresolved incident reports from
Supabase and requires a manager, organisation administrator, or platform administrator profile.
Impact metrics and audit-history pages intentionally show an unavailable state: this repository
does not define organisation analytics aggregation or persisted audit-event APIs. Do not treat
these pages as reporting or compliance evidence.

## Trust and access limitations

The current database schema has no user-credential, credential-sharing-consent, or consent-history
contract. In Supabase-backed mode, profiles therefore expose no seeded credentials; a trust
passport, cross-organisation credential sharing, consent revocation, and renewal tracking cannot
be safely enabled until those records and server-enforced policies exist. No universal trust score
is used.

The sign-in page uses Supabase email/password authentication. Dashboard, organisation, and admin
routes use authenticated profile roles; the former client-side role switch and automatic role
elevation have been removed. Frontend route checks improve UX only and are not an authorization
boundary. Supabase RLS and server-side role checks must remain authoritative for every protected
read and write. The repository has no database migrations or deployment configuration; do not
deploy it as a production service until backend policies, auth flows, secrets, and hosting
settings have been reviewed and configured.

Without Supabase configuration, the development build may use clearly labelled local demo data.
Production builds reject local fallback reads and writes for resource and organisation services.
Several organisation registration and verification write operations still lack backend persistence
and return an explicit unavailable error when Supabase is configured.
The frontend test suite covers selected UI and service behavior; it does not replace authenticated
end-to-end testing against a configured backend.

Production deployment has not been attempted because no hosting target or production credentials
are configured. Never commit `.env`, `.env.local`, API keys, passwords, or database credentials.
