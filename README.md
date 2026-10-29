# ShareSphere

ShareSphere is a React, TypeScript, and Vite application for discovering shared institutional resources and managing booking requests.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file to connect to Supabase. Booking actions require an authenticated Supabase session and the database tables and row-level security policies configured for the account. The repository currently does not include database migrations or a sign-in UI.

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

The application has no sign-in page implementation or route-level authentication guard. The
development role selector is not authorization. Supabase RLS and server-side role checks must
remain authoritative for every protected read and write. The repository has no database
migrations or deployment configuration; do not deploy it as a production service until those
backend policies, auth flows, secrets, and hosting settings have been reviewed and configured.
The current frontend test suite covers notification list rendering, filters, read updates, and
backend error handling. It does not replace authenticated end-to-end testing against a configured
backend.

The other remote feature branches currently have no commits beyond the common ancestor of this
checkout, so there were no branch-specific changes to merge during this pass. `origin/main` has a
separate scaffold commit from that ancestor; its tree removes current booking, resource, and
organisation implementations, so it was not merged to avoid discarding working functionality.
Production deployment was not attempted because no hosting target or production credentials are
configured.
