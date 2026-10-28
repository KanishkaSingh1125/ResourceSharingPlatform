# ShareSphere

ShareSphere is a React, TypeScript, and Vite application for discovering shared institutional resources and managing booking requests.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run dev
npm run build
npm run lint
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file to connect to Supabase. Booking actions require an authenticated Supabase session and the database tables and row-level security policies configured for the account. The repository currently does not include database migrations or a sign-in UI.

## Booking workflow status

Booking lists, details, availability queries, submissions, cancellations, review decisions, and no-show updates use the Supabase `bookings` table and display returned records rather than local booking seeds. The create form reuses the same request ID on a retry to avoid duplicate inserts.

Availability slots are derived from resource operating hours and overlapping booking rows returned by Supabase. A server-side exclusion constraint or atomic booking RPC is still needed to prevent two simultaneous requests from claiming the same slot. The database must also enforce eligibility, organisation roles, status transitions, and booking policies; client checks are not an authorization boundary.

Rescheduling is intentionally unavailable until its backend contract and persistence fields are defined. The schema currently has no proposed replacement-time or reschedule-reason fields. The interface does not mark requests as confirmed unless the backend returns an approved/confirmed status.
