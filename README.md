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

### 4. Apply the database migration

The migration file `supabase/migrations/20261028000001_create_profiles.sql` creates:
- `public.profiles` table linked to `auth.users`
- Auto-creation trigger for new signups
- Row Level Security policies
- Protected-field trigger to prevent privilege escalation

**Option A — Supabase Dashboard SQL Editor:**
1. Open the Supabase Dashboard → **SQL Editor**
2. Paste the contents of the migration file
3. Click **Run**

**Option B — Supabase CLI (if available):**
```bash
supabase db reset   # applies all migrations + seed data
```

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

| Feature                        | Status        |
|--------------------------------|---------------|
| Project scaffolding            | ✅ Complete    |
| Routing & layouts              | ✅ Complete    |
| Design tokens / global styles  | ✅ Complete    |
| Supabase client setup          | ✅ Complete    |
| UI component library (basics)  | ✅ Complete    |
| Authentication (login/register)| ✅ Complete    |
| Email verification             | ✅ Complete    |
| Password recovery              | ✅ Complete    |
| Profile management             | ✅ Complete    |
| Database migration (profiles)  | ✅ Complete    |
| Row Level Security             | ✅ Complete    |
| Protected routes               | ✅ Complete    |
| Organisation management        | 🔲 Planned    |
| Resource listing & browsing    | 🔲 Planned    |
| Booking system                 | 🔲 Planned    |
| Eligibility rules engine       | 🔲 Planned    |
| Incident reporting             | 🔲 Planned    |
| AI-assisted resource matching  | 🔲 Planned    |
| Admin panel                    | 🔲 Planned    |

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

## 🧑‍💻 Contributing (Hackathon Team)

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Push and open a pull request against `main`

> **Do not commit** `.env.local` — it is git-ignored. Only commit `.env.example` with
> placeholder variable names.

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
