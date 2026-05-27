@AGENTS.md

# Vertriebs-OS — AI Assistant Guide

## Project Overview

**Vertriebs-OS** (Sales Operating System) is a German-language CRM and sales-management PWA built for ERGO insurance advisors. It tracks customer pipelines (VG), recruitment pipelines (RG), TTV call sessions, team performance, and provides AI coaching via the Claude API.

- **Package name:** `command-center` (v0.1.0)
- **Domain:** ERGO insurance sales in Germany
- **Primary user:** Yazan Omran — financial advisor growing a sales team
- **Language:** German throughout UI, routes, and database values
- **Deployed to:** Vercel (`command-center-pied-five.vercel.app`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Database | Supabase (PostgreSQL) — raw JS client, no ORM |
| Auth | Supabase Auth (PKCE + magic links) |
| AI | Anthropic Claude (`@anthropic-ai/sdk` ^0.92.0) |
| UI primitives | Radix UI (Avatar, Dialog, Dropdown, Select) |
| Icons | `lucide-react` |
| PWA | `next-pwa` (service worker, disabled in dev) |
| Runtime bundler | Turbopack (enabled via empty `turbopack: {}` in next.config.ts) |

**No** test framework, **no** state-management library (Zustand/Redux), **no** ORM (Prisma/Drizzle).

---

## Next.js 16 — Critical Notes

Before writing any Next.js code, read `node_modules/next/dist/docs/` — Next.js 16 has breaking changes vs. earlier versions. Key points:

- This project uses the **App Router** exclusively. No Pages Router.
- All layouts, pages, and API routes live under `src/app/`.
- Server Components are default; add `'use client'` only when needed.
- `next.config.ts` exports via `module.exports` (CommonJS) due to `next-pwa` interop — do not switch to ESM exports.
- Turbopack is active in development (`next dev` uses Turbopack automatically).

---

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (PWA metadata, fonts)
│   ├── page.tsx                # Root → redirects to /dashboard
│   ├── globals.css             # Design system (CSS custom properties, dark theme)
│   ├── api/
│   │   ├── ki/route.ts         # POST — Claude chat (claude-haiku-4-5)
│   │   ├── ki/analyse/route.ts # POST — Claude JSON extraction (claude-sonnet-4-6)
│   │   ├── admin/invite/route.ts        # POST — Supabase invitation emails
│   │   └── admin/invitations/route.ts  # GET/POST/DELETE — invitation management
│   ├── auth/callback/route.ts  # Supabase PKCE / magic-link handler → /set-password
│   ├── login/                  # Login form + password reset
│   ├── set-password/           # New-user password setup
│   └── dashboard/              # All authenticated views (27 routes)
│       ├── layout.tsx          # Sidebar + BottomNav + gradient background
│       ├── page.tsx            # KPIs, streak, TTV sessions
│       ├── namensliste/        # Contact/name list
│       ├── vg/                 # Customer pipeline (Vertriebsgeist)
│       ├── rg/                 # Recruitment pipeline
│       ├── ttv/                # Call-tracking calendar
│       ├── calls/              # Call logging
│       ├── pipeline/           # Sales pipeline view
│       ├── deals/              # Deals / contracts
│       ├── abschluesse/        # Completed agreements
│       ├── proposals/          # Proposals
│       ├── kontakte/           # Contact management
│       ├── outreach/           # Outreach tracking
│       ├── partners/           # Business partners
│       ├── team/               # Org chart
│       ├── admin/              # Team access management
│       ├── kpi/                # KPI metrics
│       ├── statistiken/        # Statistics
│       ├── finanzen/           # Finance tracking
│       ├── zeiterfassung/      # Time tracking
│       ├── habits/             # Habits / routines
│       ├── ich/                # Personal profile
│       ├── ai-team/            # AI coaching assistant
│       ├── automationen/       # Automations
│       ├── tools/              # Tools menu
│       ├── tools/vorlagen/     # Templates
│       ├── content-studio/     # Content creation
│       └── kunden-avatar/      # Customer avatar profiles
├── components/
│   ├── Sidebar.tsx             # Desktop navigation (123 lines)
│   ├── BottomNav.tsx           # Mobile navigation (300 lines)
│   ├── ClientAnalysis.tsx      # AI-powered customer analysis modal (438 lines)
│   ├── ContactImport.tsx       # Contact import with file parsing (262 lines)
│   └── PwaSetup.tsx            # PWA service worker registration (60 lines)
├── lib/
│   ├── supabase.ts             # Browser Supabase client (SSR-aware)
│   ├── ergo.ts                 # ERGO domain logic (see below)
│   └── utils.ts                # cn() — Tailwind class merging
└── middleware.ts               # Auth guard (redirects, public-path whitelist)
```

---

## Domain Logic (`src/lib/ergo.ts`)

All ERGO-specific business logic lives here. Import from here; do not duplicate.

- **`calcLaufzeit(alter)`** — policy duration in years (age < 32 → 35 years, else `max(1, 67 - age)`)
- **`calcEinheiten(sparsumme, alter)`** — insurance unit calculation (`savings × duration × 0.023579`)
- **`PRODUKTIONSMONATE`** — 2026 production-month deadlines (P-Schluss dates at 17:30)
- **`getCurrentProduktionsmonat()`** — returns the next upcoming deadline
- **`formatCountdown(deadline)`** — human-readable countdown with status: `'normal' | 'today' | 'critical'`
- **`VG_STAGES`** — customer pipeline stages: `kundenpotenzial → vorqualifiziert → beraten → abgeschlossen`
- **`RG_STAGES`** — recruitment pipeline stages: `partnerpotenzial → vorqualifiziert → rekrutierungsgespraech → gst → im_team`
- **`KARRIERESTUFEN`** — 6 ERGO career levels from Repräsentant to Direktionsrepräsentant Stufe 6

---

## Database Schema (Supabase / PostgreSQL)

Three core tables. All use UUID primary keys with `gen_random_uuid()`. RLS is **disabled** (dev only — enable before production).

```sql
contacts (id, name, phone, source, type, stage, notes, created_at, last_contact)
  -- source default: 'Instagram'
  -- type default: 'kunde'
  -- stage default: 'neu'

outreach (id, name, channel, status, message, created_at)
  -- channel default: 'instagram'
  -- status default: 'gesendet'

partners (id, name, phone, level, termine, abschluesse, status, notes, join_date, created_at)
  -- level default: 'Junior'
  -- status default: 'neu'
```

Use the Supabase JS client (`src/lib/supabase.ts`) for all queries. There is no ORM — write raw `.from('table').select(...)` style queries.

---

## Authentication Flow

1. Admin sends invite via `/api/admin/invite` (requires `SUPABASE_SERVICE_ROLE_KEY`)
2. User clicks email link → `/auth/callback` exchanges PKCE code → redirects to `/set-password`
3. User sets password at `/set-password`
4. Normal login at `/login` with email + password
5. Middleware (`src/middleware.ts`) protects all routes except `/login`, `/set-password`, `/auth/callback`

Server-side session management uses `@supabase/ssr` cookie helpers. The browser client in `src/lib/supabase.ts` is for client components only.

---

## API Routes

| Route | Method | Auth required | Purpose |
|---|---|---|---|
| `/api/ki` | POST | Yes (session) | Claude chat, model: `claude-haiku-4-5` |
| `/api/ki/analyse` | POST | Yes (session) | JSON extraction from notes, model: `claude-sonnet-4-6` |
| `/api/admin/invite` | POST | Service role key | Send invitation email |
| `/api/admin/invitations` | GET/POST/DELETE | Service role key | Manage invitations |
| `/auth/callback` | GET | None | Supabase auth callback |

---

## Environment Variables

```
# Public (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=   # admin invite routes
ANTHROPIC_API_KEY=            # /api/ki/* routes
```

No `.env.example` file exists — set these manually in Vercel dashboard and `.env.local` locally.

---

## Design System

Dark theme with FTMO-inspired color palette defined via CSS custom properties in `src/app/globals.css`:

- **Background:** `#080c14` (primary), `#141a24` (cards/panels)
- **Accent:** `#1e7ef7` (FTMO blue — buttons, active states)
- **Success:** `#22c55e` | **Warning:** `#f59e0b` | **Error:** `#ef4444`
- **Breakpoint:** 768px — desktop shows Sidebar, mobile shows BottomNav

Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes (wraps `clsx` + `tailwind-merge`).

---

## Development Workflow

```bash
npm run dev    # Start dev server (Turbopack, PWA disabled)
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint (next core-web-vitals + typescript rules)
```

**No test suite exists.** Verify changes manually and via `npm run lint`.

PWA service worker is disabled in development (`NODE_ENV === 'development'`). Test PWA features only in a production build.

---

## Key Conventions

1. **German naming throughout** — route segments, database values, UI labels, and variable names follow German conventions (e.g., `abschluesse`, `termine`, `karrierestufen`).
2. **All components are `'use client'`** — the five components in `src/components/` all require browser APIs. Don't remove this directive.
3. **No state management library** — use React hooks (`useState`, `useEffect`) and Supabase queries directly.
4. **Server components for pages** — dashboard pages are server components by default; add `'use client'` only when interactivity requires it.
5. **Import paths** — use `@/` alias (maps to `src/`). Example: `import { cn } from '@/lib/utils'`.
6. **Claude API models** — Haiku (`claude-haiku-4-5`) for conversational chat, Sonnet (`claude-sonnet-4-6`) for structured extraction tasks.
7. **No ORM** — write direct Supabase JS queries. Follow existing patterns in page files.
8. **Tailwind v4** — syntax and plugin API differ from v3. Use `@tailwindcss/postcss` not the legacy PostCSS plugin.

---

## Files to Read Before Modifying Key Areas

| Area | Read first |
|---|---|
| Any Next.js API or routing | `node_modules/next/dist/docs/` |
| ERGO calculations or stages | `src/lib/ergo.ts` |
| Auth flow | `src/middleware.ts`, `src/app/auth/callback/route.ts` |
| Navigation | `src/components/Sidebar.tsx`, `src/components/BottomNav.tsx` |
| Database tables | `supabase-schema.sql` |
| Claude API usage | `src/app/api/ki/route.ts`, `src/app/api/ki/analyse/route.ts` |
