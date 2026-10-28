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
│   ├── migrations/           SQL migration files (one per schema change)
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

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project URL and anon key:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. (Optional) Start local Supabase

> Requires [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker Desktop.

```bash
supabase start
supabase db reset   # applies migrations + seed data
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
| Authentication (login/register)| 🔲 Planned    |
| Organisation management        | 🔲 Planned    |
| Resource listing & browsing    | 🔲 Planned    |
| Booking system                 | 🔲 Planned    |
| Eligibility rules engine       | 🔲 Planned    |
| Incident reporting             | 🔲 Planned    |
| AI-assisted resource matching  | 🔲 Planned    |
| Admin panel                    | 🔲 Planned    |
| Database migrations            | 🔲 Planned    |

---

## 🧑‍💻 Contributing (Hackathon Team)

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Push and open a pull request against `main`

> **Do not commit** `.env` — it is git-ignored. Only commit `.env.example` with
> placeholder variable names.

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
