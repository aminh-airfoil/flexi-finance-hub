# Flexi Finance Hub — FinTrack

A personal finance tracker built with Vite, React, TypeScript, Tailwind CSS, and Supabase. Track expenses, manage budgets, and monitor your finances with real-time sync and smart analytics.

**Live site:** https://flexifinance-vaqglf5x.manus.space

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v3, shadcn/ui |
| Backend / Auth | Supabase (Auth + PostgreSQL) |
| Charts | Recharts |
| Date handling | date-fns v3, react-day-picker v8 |
| Package manager | pnpm |

---

## Features

- Email/password and Google OAuth sign-in via Supabase Auth
- Multi-account management (Checking, Savings, etc.)
- Transaction tracking with categories and notes
- Budget management per category
- Analytics dashboard with spending breakdowns
- Row-level security — all data is scoped to the authenticated user

---

## Project Structure

```
client/          ← React frontend (Vite root)
  src/
    pages/       ← Page-level components (Auth, Dashboard, etc.)
    components/  ← Reusable UI components (shadcn/ui + custom)
    contexts/    ← React contexts (Auth, etc.)
    hooks/       ← Custom hooks
    integrations/
      supabase/  ← Supabase client + generated types
server/          ← Express backend (Manus hosting)
supabase/
  migrations/    ← Database schema (accounts, categories, transactions)
shared/          ← Shared types and constants
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project with the schema applied (see below)

### 1. Clone the repo

```sh
git clone https://github.com/aminh-airfoil/flexi-finance-hub.git
cd flexi-finance-hub
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

Both values are found in your Supabase dashboard under **Project Settings → API**.

### 4. Apply the database schema

Run the SQL in `supabase/migrations/` against your Supabase project via the SQL Editor. The schema creates three tables with row-level security policies:

- `accounts` — user bank accounts
- `categories` — expense categories with budgets
- `transactions` — individual transactions linked to accounts and categories

### 5. Configure Supabase Auth

In your Supabase dashboard under **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (or your deployed domain)
- **Redirect URLs:** `http://localhost:3000/**`

For Google OAuth, enable the Google provider under **Authentication → Providers** and register `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud Console.

### 6. Start the development server

```sh
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Deployment

This project is hosted on [Manus](https://manus.im) at `https://flexifinance-vaqglf5x.manus.space`.

To deploy your own instance, update the Supabase Auth redirect URLs to match your deployment domain.

---

## Database Schema

The full schema is in `supabase/migrations/`. Key design decisions:

- All tables include `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` for data isolation
- Row-level security (RLS) is enabled on all tables — users can only read/write their own data
- `updated_at` is automatically maintained via a PostgreSQL trigger function

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes and push to your fork
4. Open a pull request against `main`
