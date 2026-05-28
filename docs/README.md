# Hangout

A link-first group scheduling app for college friend groups. Drop a plan link in iMessage, everyone marks their availability in under 30 seconds — no account, no app download, no friction.

Live at [hangout-friends.vercel.app](https://hangout-friends.vercel.app)

---

## How it works

The atomic unit is a **plan**: a shareable URL anyone can respond to without creating an account. A plan creator names the hangout, sets a date range, and shares the link. Recipients tap it, enter a first name, mark their availability, and they're done. The creator uses the availability heatmap and activity ideas to auto-schedule the best time.

**Pods** are persistent groups for people who plan together repeatedly. Pods require an account and add persistent membership, a shared activity idea bank, and plan history. Most users will never need a pod — the plan link is the product.

---

## Current state (as of May 2026)

The app is mid-pivot from a single-group shared board to the plans-first model. The core plan flow (`/polls/new`, `/polls/[id]`) exists and is being actively polished. Legacy global surfaces (`/availability`, `/ideas`, `/events`) are present in the codebase but are being deprecated in favor of plan-scoped equivalents.

---

## Features

### Plans (core, no account required)
- **Create a plan** — name + date range → shareable URL (currently `/polls/[id]`; migrating to `/p/[slug]`)
- **Respond anonymously** — enter a first name, drag-select availability on the weekly grid
- **Availability heatmap** — color-graded grid showing overlap density; tap a cell to see who's free
- **Activity ideas + voting** — anyone suggests an activity, anyone upvotes; no downvotes
- **Auto-schedule** — one click picks the best (time, activity) pair based on voter overlap
- **RSVP** — yes / maybe / no once a plan is locked
- **OG link previews** — rich previews in iMessage, Discord, Slack (served from `/api/og`)

### Pods (account required)
- Create a named pod, share a join link
- Pod-scoped ideas, events, and availability
- Pod-level auto-scheduling

### Auth (in transition)
- Current: name + optional password, token stored in localStorage (`context/UserContext.tsx`)
- Target: email + magic link (no password, no phone number); anonymous responses identified by first name + cookie, scoped to one plan

### Admin
- PIN-protected admin panel at `/admin`
- Moderate ideas, events, and bug reports
- Claude AI fix-suggestion button on bug reports (requires `ANTHROPIC_API_KEY`)

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Postgres + RLS, no Supabase Auth — custom token system, transitioning to magic link)
- **Vercel** (hosting, automatic deploys from `main`)
- **Google Maps API** — travel time estimates on ideas (optional)
- **Anthropic Claude** — admin bug-report fix suggestions (optional)

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000          # canonical app origin (no trailing slash)
ADMIN_PIN=your_admin_pin
SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token
GOOGLE_MAPS_API_KEY=your_google_maps_key            # optional — enables travel time estimates
ANTHROPIC_API_KEY=your_anthropic_key                # optional — enables Claude fix suggestions in admin
GOOGLE_CLIENT_ID=your_google_oauth_client_id        # Google Calendar OAuth (local dev only; see below)
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

**`NEXT_PUBLIC_BASE_URL`** — Single canonical origin for the app: OG/meta absolute URLs, share links, and Google OAuth redirect construction. Use `http://localhost:3000` locally. In Vercel **Production**, set to `https://hangout-friends.vercel.app` (no trailing slash). Do not use a separate `NEXT_PUBLIC_APP_URL`; that name is retired.

`SUPABASE_SERVICE_ROLE_KEY` is the service role secret from your Supabase project's API settings. **Never prefix this with `NEXT_PUBLIC_`** — it must remain server-only. All API routes use this key via `supabaseAdmin` in `lib/supabase.ts`, which bypasses RLS. The anon key is retained only for public-read Server Components.

`SUPABASE_ACCESS_TOKEN` is a personal access token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). Used by the migration runner at build time.

### Google Calendar OAuth (planned)

Routes are not implemented yet; paths and env names are fixed so GCP / Vercel setup can proceed.

| Item | Value |
|------|--------|
| Auth start (planned) | `GET /api/google/auth` |
| OAuth callback (planned) | `GET /api/google/callback` |
| Redirect URI (prod) | `https://hangout-friends.vercel.app/api/google/callback` |
| Redirect URI (local) | `http://localhost:3000/api/google/callback` |
| JavaScript origins | `https://hangout-friends.vercel.app`, `http://localhost:3000` |

**Environments:** OAuth is enabled for **production + localhost only**. Vercel **Preview** deploys do not get Google OAuth — no preview URLs in the GCP client, and `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are not required for Preview. Calendar connect will 404 or no-op on preview until we explicitly expand coverage.

**Where to store keys**

| Variable | `.env.local` | Vercel Production | Vercel Preview |
|----------|--------------|-------------------|----------------|
| `GOOGLE_CLIENT_ID` | yes | yes (Sensitive) | omit |
| `GOOGLE_CLIENT_SECRET` | yes | yes (Sensitive) | omit |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://hangout-friends.vercel.app` | optional; previews don't use OAuth |

**GCP checklist (external Web client)**

1. OAuth consent screen — app name, support email, scopes (e.g. `calendar.readonly`).
2. Enable **Google Calendar API** on the project.
3. Create OAuth client → register redirect URIs and JS origins exactly as in the table above.
4. While app is in **Testing**, add test users on the consent screen; only they can authorize until publish/verification.

**When to change the OAuth environment policy**

Expand beyond prod + localhost when you need Calendar connect on a stable non-prod host (e.g. dedicated staging). Then:

1. **Google Cloud Console** → Credentials → your Web client → add the new **Authorized redirect URI** and **Authorized JavaScript origin** (exact URL, including path for redirects).
2. **Vercel** → add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to that environment; set `NEXT_PUBLIC_BASE_URL` to that host's origin.
3. **Code** — ensure `/api/google/auth` and `/api/google/callback` build redirect URLs from `NEXT_PUBLIC_BASE_URL` only (no hardcoded hosts).

If the callback path changes (e.g. rename `/api/google/callback`), update GCP redirect URIs, this doc, and the OAuth client constructor in `lib/googleCalendar.ts` in the same change.

**Do not** add wildcard or per-preview `*.vercel.app` redirect URIs; Google requires exact matches and preview URLs change per deploy.

### Database migrations

Migrations live in `migrations/` as numbered SQL files. They run automatically before every build:

```bash
node scripts/migrate.mjs   # run manually
npm run build              # runs migrations then builds
```

Applied migrations are tracked in a `_migrations` table. New files are picked up automatically on the next deploy. Never edit an already-applied migration — add a new numbered file instead.

`_migrations` has RLS enabled with no policies, which locks it to deny-all for every PostgREST client role. The migration runner connects via a direct Postgres connection (service role), so it bypasses RLS and is unaffected.

---

## Deployment

Connected to Vercel via GitHub — every push to `main` triggers a production deploy. Migrations run automatically as part of the build step.

Set `NEXT_PUBLIC_BASE_URL` per Vercel environment: `https://hangout-friends.vercel.app` for **Production**, `http://localhost:3000` for **Development** (pull with `vercel env pull`). Preview deployments intentionally omit Google OAuth credentials (see Google Calendar OAuth above).

```bash
npx vercel --prod   # manual deploy
```

---

## Project structure

```
app/
  admin/                  # PIN-protected admin panel
  api/
    admin/                # Admin data
    auto-schedule/        # Auto-schedule endpoint (legacy global)
    availability/         # Availability API (legacy global)
    bug-reports/          # Bug report CRUD
    claude-fix/           # Claude AI fix suggestion
    events/               # Events + RSVP (legacy global)
    google/               # Google Calendar OAuth: auth + callback (planned: /api/google/auth, /api/google/callback)
    ideas/                # Ideas + voting (legacy global)
    og/                   # Dynamic OG image generation for plan links
    places/autocomplete/  # Google Places autocomplete for idea locations
    pods/                 # Pod CRUD, pod-scoped ideas and events
    polls/                # Plan CRUD and availability responses
    travel-time/          # Google Maps travel time lookup
    users/                # User lookup / creation
  availability/           # Legacy global availability page (being deprecated)
  bugs/                   # Bug report form
  calendar/               # Google Calendar page (being removed)
  events/                 # Legacy global events page (being deprecated)
  ideas/                  # Legacy global ideas page (being deprecated)
  pods/                   # Pod list, pod detail, join, create
  polls/                  # Plan create (/new) and respond (/[id])
  profile/                # User profile page
  layout.tsx
  page.tsx                # Home / landing
components/
  AvailabilityGrid.tsx
  BottomNav.tsx           # Fixed bottom tab bar (mobile)
  CreateEventForm.tsx
  EventsList.tsx
  IdeasBoard.tsx
  NameModal.tsx           # Global name prompt (being replaced with inline prompt on plan pages)
  Nav.tsx
context/
  UserContext.tsx         # Token-based identity in localStorage (being replaced with cookies + magic link)
lib/
  googleCalendar.ts       # Google Calendar API helpers
  password.ts             # scrypt hashing for optional passwords
  supabase.ts             # Lazy-initialized Supabase client
migrations/               # Numbered SQL migration files (001–016)
scripts/
  migrate.mjs             # Migration runner (Supabase Management API)
types/
  database.ts             # Supabase table types + extended query types
```

---

## What's being built now

Active priorities (synced with [Linear](https://linear.app/hangout-friends) after commit `284cb7a`, May 28 2026):

### Shipped this session (Done)

| Issue | What landed |
|-------|-------------|
| **HGT-10** | NameModal skipped on `/p/*` and `/polls/*` plan pages |
| **HGT-44** | BottomNav + top Nav hidden on plan respond pages |
| **HGT-6** | Save-as-you-go availability (no explicit Save button) |
| **HGT-23/24/25** | 44px grid cells, tap-to-toggle default on mobile |
| **HGT-35** | Slug URLs at `/p/[slug]`, UUID redirect, AASA `/p/*` |
| **HGT-7** | Plans-first home dashboard; legacy surfaces off nav |
| **HGT-8**, **HGT-26** | Plan creation + BottomNav tabs (prior work) |

### In Review — MVP shipped, needs QA / polish

| Issue | Status |
|-------|--------|
| **HGT-18** | Plan-scoped ideas + voting (migration 021, API, `PollIdeasBoard`) |
| **HGT-19** | Auto-schedule + lock to `scheduled` state |
| **HGT-20** | RSVP yes/maybe/no — API works; **UI polish open** (name lists, self-feedback, one-step flow, "who's coming") |

Dev verification: `npm run verify:021` · `npm run test:plan-loop`

### Next up (active backlog)

1. **HGT-17** (Urgent) — 5-friend mobile Safari teardown test (Sprint 0 exit criteria; unblocked)
2. **HGT-20 polish** — close RSVP visibility gaps from QA (see Linear comment on HGT-20)
3. **HGT-21** — Verify OG previews in iMessage, WhatsApp, Discord, Slack

### Deferred (post-M1)

- **HGT-27/28** — PWA + push notifications
- **HGT-11/13/15** — Auth + cookie identity
- **HGT-29/34** — Google Calendar rewrite
- **HGT-22** — Auto-scheduler: show top 3 candidates instead of silent pick
- **PRODUCT.md §3** — Tap heatmap cell → see who's free (not yet ticketed)
