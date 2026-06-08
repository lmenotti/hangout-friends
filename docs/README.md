# Hangout

A link-first group scheduling app for college friend groups. Drop a plan link in iMessage, everyone marks their availability in under 30 seconds — no account, no app download, no friction.

Live at [hangout-friends.vercel.app](https://hangout-friends.vercel.app)

---

## Documentation map (read in this order)

| Doc | Purpose |
|-----|---------|
| [GOALS.md](./GOALS.md) | Strategy, milestones, kill criteria |
| [PRODUCT.md](./PRODUCT.md) | v1 blueprint — what to build and what to refuse |
| **[PERFORMANCE.md](./PERFORMANCE.md)** | **Speed is a product feature** — sacred-path rules, optimization workflow, agent checklist |
| **This file** | Current codebase, env vars, deployment, **active priorities** |
| [AGENT_WORK.md](./AGENT_WORK.md) | Sprint 4 QA checklist + Wave 4 agent prompts |
| [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md) | Calendar OAuth + deferred QA |
| [PRIVACY.md](./PRIVACY.md) | Data inventory, encryption vs anonymization, retention — **read before storing new PII** |
| [ROADMAP.md](./ROADMAP.md) | Post-MVP ideas (not commitments) |
| [archive/](./archive/) | Historical audits and May 2026 wave plan — **not authoritative** |

Agent entry point: `CLAUDE.md` at repo root (points here).

**Local IDE/agent tooling:** `.gitignore` excludes machine-specific Antigravity install state (`.antigravitycli/`, `.antigravity/*` except shareable `rules`, project `.gemini/`, `mcp_config.json`). Shareable Antigravity rules in `.antigravity/rules` or `GEMINI.md` at repo root are not ignored.

---

## How it works

The atomic unit is a **plan**: a shareable URL anyone can respond to without creating an account. A plan creator names the hangout, sets a date range, and shares the link. Recipients tap it, enter a first name, mark their availability, and they're done. The creator uses the availability heatmap and activity ideas to auto-schedule the best time.

**Pods** are persistent groups for people who plan together repeatedly. Pods require an account and add persistent membership, a shared activity idea bank, and plan history. Most users will never need a pod — the plan link is the product.

---

## Current state (as of June 1, 2026)

**Waves 0–3** (MVP agent plan) are **code-complete**. The product is plans-first: create at `/polls/new`, share `/p/[slug]`, anonymous respond with save-as-you-go availability, ideas, auto-schedule, and RSVP — no account required.

**Sprint 4** (human validation — HGT-17, platform OG, device PWA/push, prod calendar) has **not started**. See [AGENT_WORK.md](./AGENT_WORK.md).

**Wave 4** (optional code before or after Sprint 4): top-3 scheduler (HGT-22). Magic link auth (HGT-11/13) shipped. ICS (HGT-30) is done.

**Active (Jun 2026):** **iOS PWA tester feedback** filed as HGT-138–147 (nav chrome, grid rewrite, live updates, create-flow perf, push UX, etc.). Re-file script: `node scripts/linear-ios-pwa-feedback-jun2026.mjs` (needs `LINEAR_API_KEY` in `.env.local`).

**Active (Jun 2026):** **HGT-91** account sign-in strategy — magic link first ([HGT-148](https://linear.app/hangout-friends/issue/HGT-148) polish), lazy prompts ([HGT-149](https://linear.app/hangout-friends/issue/HGT-149)). Legacy multi-method tickets HGT-92–97 tagged *Deprioritized* / *Might be removed* in Linear (not deleted). Sync: `node scripts/linear-auth-strategy-jun2026.mjs`. See [AGENT_WORK.md](./AGENT_WORK.md).

**Shipped (Waves 0–3 + follow-ups):**

| Area | Linear / work | Notes |
|------|----------------|-------|
| Link shell | HGT-6/7/8/10/23–26/35/44 | Slug URLs, mobile grid, no NameModal on plan pages, hidden nav chrome |
| Plan lifecycle | HGT-18/19/20 | Ideas, auto-schedule + lock, RSVP + heatmap drill-down — E2E passes |
| OG previews | HGT-21 | Code shipped; platform verify (iMessage, WhatsApp, Discord, Slack) deferred to human QA |
| PWA | HGT-27 | `manifest.json`, icons, `InstallPrompt` |
| Cookie identity | HGT-15 | Per-plan httpOnly cookie via `lib/planIdentity.ts` |
| Plan expiration | migration 022 | Daily cron archives plans past `expires_at` |
| Google Calendar | HGT-29/34 | OAuth routes live; prod smoke test deferred |
| Push | HGT-28 | migration 023, service worker, 3 allowlisted types; `PushNotificationPrompt` + `/api/push/watches` (httpOnly plan cookie reads for `plan_watches`) |
| Perf (phase 1) | HGT-84/88/110/112 | migration 027 (`poll_responses`, `idea_votes` indexes); filtered `idea_votes` in auto-schedule; client-safe `lib/formatScheduledLabel.ts`; removed unused `date-fns`/`rrule` |
| Perf (phase 2) | HGT-83/87 | `/p/[slug]` SSR passes `initialData` to `PollPageClient` via `lib/planPageData.ts`; `getPollBySlug` wrapped in `cache()` for metadata dedupe. Measure: `node scripts/measure-plan-page.mjs <slug> <poll-id>` |
| QoL batch (Jun 2026) | HGT-49/51/59/80/104/115/117/136 | Copy-link (HGT-59); return-to-plan (HGT-51); rolling 4-week create calendar (HGT-136); heatmap filter + slot inspect (HGT-117); admin PIN guard (HGT-104); post-create share (HGT-115); creator rename API (HGT-49) |

Legacy global surfaces (`/availability`, `/ideas`, `/events`) remain in the repo but are off nav. Orphaned global components removed. Pods exist but are frozen for MVP validation.

---

## Features

### Plans (core, no account required)
- **Create a plan** — name + date range → shareable slug URL at `/p/[slug]`
- **Respond anonymously** — enter a first name, drag-select availability on the weekly grid
- **Availability heatmap** — color-graded grid showing overlap density; tap a cell to see who's free
- **Activity ideas + voting** — anyone suggests an activity, anyone upvotes; no downvotes
- **Auto-schedule** — one click picks the best (time, activity) pair based on voter overlap
- **RSVP** — yes / maybe / no once a plan is locked
- **OG link previews** — rich previews in iMessage, Discord, Slack (served from `/api/og`)
- **Push notifications** — after responding to a plan, user leaves the respond page → dismissible `PushNotificationPrompt` → Enable calls `Notification.requestPermission()` → `/api/push/subscribe` registers watches; server reads httpOnly `hangout_plan_*` cookies via `/api/push/watches` (not visible to `document.cookie`)

### Pods (account required)
- Create a named pod, share a join link
- Pod-scoped ideas, events, and availability
- Pod-level auto-scheduling
- Pod idea vote/schedule API routes enforce `pod_members` membership (HGT-107), same as ideas/events list routes

### Auth
- **Plans:** per-plan httpOnly cookie + first name (`lib/planIdentity.ts`) — no account required
- **Accounts (v1 — HGT-91):**
  - **Primary** (`/auth/signin`): email magic link only (shipped, HGT-13); polish in **HGT-148**
  - **Lazy prompts:** contextual account nudges at success moments (**HGT-149**) — not upfront walls
  - **Step-up (later, HGT-93 — deprioritized):** SMS OTP for recovery + high-risk actions only, not routine login
  - **Medium-term (HGT-95 — deprioritized):** passkeys for power users
  - **Likely out of v1:** password (HGT-94), Google/Apple identity SSO (HGT-96/97), email+phone tabs (HGT-92) — Linear labels *Might be removed* / *Deprioritized*
  - Session: `gs_token` cookie (`context/UserContext.tsx`)
  - Display name resolution (`lib/displayName.ts`, `users.name_source`): plan cookie → email local part → Google profile `given_name`; signed-in users can edit name on `/profile` (PATCH `/api/users`, `name_source: manual`, HGT-128)
  - `/auth/signup` redirects to sign-in; `/auth/signin/options` stub points to magic link
- **Sacred:** anonymous `/p/*` respond never requires phone, email, or any account

### Admin
- PIN-protected admin panel at `/admin`
- Moderate ideas, events, and bug reports
- Claude AI fix-suggestion button on bug reports (requires `ANTHROPIC_API_KEY`)

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Postgres + RLS, no Supabase Auth — custom token + magic link sessions)
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
ADMIN_PIN=your_admin_pin          # required for admin API routes in prod/preview; no default — set in Vercel (sensitive in prod/preview)
SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token
GOOGLE_MAPS_API_KEY=your_google_maps_key            # optional — enables travel time estimates
ANTHROPIC_API_KEY=your_anthropic_key                # optional — enables Claude fix suggestions in admin
GOOGLE_CLIENT_ID=your_google_oauth_client_id        # Google Calendar OAuth (see docs/GOOGLE_CALENDAR.md)
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
VAPID_PUBLIC_KEY=your_vapid_public_key              # Web Push (server)
VAPID_PRIVATE_KEY=your_vapid_private_key            # Web Push (server — never NEXT_PUBLIC_)
VAPID_SUBJECT=mailto:hello@hangout-friends.vercel.app  # optional Web Push contact URI
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key  # same public key for browser subscribe
CRON_SECRET=your_cron_secret                        # secures /api/cron/* (Vercel Cron sends Bearer token)
RESEND_API_KEY=re_xxxxxxxx                          # required in Production — magic link emails (from resend.com/api-keys)
RESEND_FROM="Hangout <auth@mail.tryhangout.com>"    # optional; this is the default if omitted
# SMS step-up / recovery (HGT-93, deprioritized) — e.g. Twilio Verify:
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_VERIFY_SERVICE_SID=...
# Apple Sign In (HGT-97, might be removed) — add only if revived:
# APPLE_CLIENT_ID=...
# APPLE_TEAM_ID=...

**Magic link email (Resend)** — Domain `mail.tryhangout.com` must be verified in the [Resend dashboard](https://resend.com/domains). Local dev: add `RESEND_API_KEY` to `.env.local` and restart `npm run dev`. Production: add the same vars in Vercel → Project → Settings → Environment Variables (Production + Development). Default sender is `auth@mail.tryhangout.com` (see `lib/sendEmail.ts`); override with `RESEND_FROM` if you use a different mailbox on that domain.
# APPLE_KEY_ID=...
# APPLE_PRIVATE_KEY=...           # .p8 contents or path
# Google SSO (HGT-96) — may use separate OAuth client from Calendar; see GOOGLE_CALENDAR.md
```

Generate Web Push VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

**`NEXT_PUBLIC_BASE_URL`** — Single canonical origin for the app: OG/meta absolute URLs, share links, and Google OAuth redirect construction. Use `http://localhost:3000` locally. In Vercel **Production**, set to `https://hangout-friends.vercel.app` (no trailing slash). Do not use a separate `NEXT_PUBLIC_APP_URL`; that name is retired.

`SUPABASE_SERVICE_ROLE_KEY` is the service role secret from your Supabase project's API settings. **Never prefix this with `NEXT_PUBLIC_`** — it must remain server-only. All API routes use this key via `supabaseAdmin` in `lib/supabase.ts`, which bypasses RLS. The anon key is retained only for public-read Server Components.

`SUPABASE_ACCESS_TOKEN` is a personal access token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). Used by the migration runner at build time.

**`ADMIN_PIN`** — Protects `/api/admin`, `/api/claude-fix`, and admin `PATCH` on `/api/bug-reports/[id]`. There is **no code default**; routes return **503** if unset or weak (`1234`, `0000`, `admin`). Send the PIN in the `x-admin-pin` header. In Vercel: **Sensitive** for Production and Preview; **plain** (non-sensitive) on Development so `vercel env pull` works locally. Never commit the value.

### Google Calendar OAuth

OAuth routes and `/api/calendar/sync` are implemented in `lib/googleCalendar.ts`. Connect/disconnect on `/profile` (also home location and display name). Preview deploys omit Google credentials (policy below). Deferred QA: **[docs/GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md)**.

| Item | Value |
|------|--------|
| Connect UI | `/profile` → Connect / Disconnect |
| Auth start | `GET /api/google/auth` (requires signed-in `gs_token` cookie) |
| OAuth callback | `GET /api/google/callback` |
| Redirect URI (prod) | `https://hangout-friends.vercel.app/api/google/callback` |
| Redirect URI (local) | `http://localhost:3000/api/google/callback` |
| JavaScript origins | `https://hangout-friends.vercel.app`, `http://localhost:3000` |

**Environments:** OAuth is enabled for **production + localhost only**. Vercel **Preview** deploys do not use Google OAuth (no preview redirect URIs in GCP).

**Where to store keys**

| Variable | `.env.local` / `vercel env pull` | Vercel Production | Vercel Preview |
|----------|----------------------------------|-------------------|----------------|
| `GOOGLE_CLIENT_ID` | yes (Development env) | yes (Sensitive) | optional; unused |
| `GOOGLE_CLIENT_SECRET` | yes (Development env) | yes (Sensitive) | optional; unused |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://hangout-friends.vercel.app` | optional |

**GCP setup (completed May 2026):** external Web client, consent screen, Calendar API enabled, test users, redirect URIs + JS origins as above.

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

**Migration `026_tighten_rls_users_and_remaining.sql` (HGT-109):** Drops anon `SELECT` on `users` (session tokens, email, Google OAuth fields were exposed via PostgREST). Drops remaining permissive mutation policies on polls, poll_responses, pods, pod_members, bug_reports, and `events` update — extending the `020` pattern. Enables RLS on `google_calendar_channels` with no policies (deny-all for anon; API uses service role). Public reads on plan/poll/pod/availability tables are unchanged for the link-first flow.

**Privacy / operator access:** Seeing plaintext rows in the Supabase dashboard is **project-operator access** (bypasses RLS), not what strangers get from the anon key. We still hash/encrypt **secrets** (session tokens, OAuth refresh tokens) and hard-delete expired plan data where policy requires — see **[PRIVACY.md](./PRIVACY.md)** and **HGT-150**.

**API auth (HGT-108, low-disruption):** Legacy global list endpoints require a valid `x-user-token` and scope results to the caller: `GET /api/events` and `GET /api/ideas` return only rows with `pod_id` null or in the user’s pods; `GET /api/availability` without `pod_id` returns only the authenticated user’s slots, and with `pod_id` requires pod membership. Plan schedule is already gated via `creator_token` on `POST /api/polls/[id]/schedule` (`lib/planCreator.ts`). `GET /api/events/[id]` is unchanged (anonymous event detail).

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
    calendar/sync/        # Google Calendar connection status, busy times, disconnect
    google/               # Google Calendar OAuth (auth + callback)
    ideas/                # Ideas + voting (legacy global)
    og/                   # Dynamic OG image generation for plan links
    places/autocomplete/  # Google Places autocomplete for idea locations
    pods/                 # Pod CRUD, pod-scoped ideas and events
    polls/                # Plan CRUD and availability responses
    travel-time/          # Google Maps travel time lookup
    users/                # User lookup / creation
  availability/           # Legacy global availability page (being deprecated)
  bugs/                   # Bug report form
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
  Nav.tsx
  PollGrid.tsx            # Plan availability grid
  InstallPrompt.tsx       # PWA install nudge
  PushNotificationPrompt.tsx
context/
  UserContext.tsx         # Account session via gs_token cookie (magic link)
lib/
  planIdentity.ts         # Per-plan httpOnly cookie for anonymous respondents
  googleCalendar.ts       # Google OAuth helpers, token storage, listBusyTimes (freebusy)
  pollSchedule.ts         # Plan auto-schedule algorithm
  supabase.ts             # Lazy-initialized Supabase client
migrations/               # Numbered SQL migration files (see migrations/ for latest)
public/
  sw.js                   # Service worker (push)
scripts/
  migrate.mjs             # Migration runner (Supabase Management API)
types/
  database.ts             # Supabase table types + extended query types
```

---

## Active priorities

Synced with [Linear](https://linear.app/hangout-friends). Full agent/QA breakdown: [AGENT_WORK.md](./AGENT_WORK.md).

### Done (code shipped — human QA where noted)

| Issue | What landed |
|-------|-------------|
| **HGT-6/7/8/10/23–26/35/44** | Link shell: save-as-you-go, plans-first home, slug URLs, mobile grid, no NameModal on plan pages, hidden nav chrome |
| **HGT-18/19/20** | Plan ideas, auto-schedule + lock, RSVP + heatmap drill-down — E2E passes |
| **HGT-21** | OG route + scheduled-state metadata — **platform verify deferred** |
| **HGT-27** | PWA manifest, icons, install prompt |
| **HGT-15** | Per-plan cookie identity on respond + RSVP |
| **Plan expiration** | migration 022, daily cron archives expired plans |
| **HGT-30** | ICS export on scheduled plans (`/api/polls/[id]/ics`) |
| **HGT-29/34** | Google Calendar OAuth + `/api/calendar/sync` — **prod OAuth test deferred** |
| **HGT-28** | Push subscriptions, service worker, 3 allowlisted types; permission prompt shipped (`PushNotificationPrompt`) — **real-device push test deferred** |
| **HGT-11/13** | Email + magic link auth; legacy name+password removed |
| **HGT-22** | Top-3 auto-schedule picker (preview → confirm) |
| **HGT-50/53/48** | Autosave grid fix; creator cookie + `?fill=1` after plan create |

Dev verification: `npm run verify:021` · `npm run test:plan-loop` · `npm run build`

### Active — account sign-in (HGT-91, v1)

Parent: **[HGT-91](https://linear.app/hangout-friends/issue/HGT-91)** — magic link first (research-aligned, Jun 2026). Re-sync Linear: `node scripts/linear-auth-strategy-jun2026.mjs`.

| Issue | Scope | Linear label |
|-------|--------|----------------|
| **HGT-148** | Polish magic link UX (copy, errors, deliverability, Autofill) | — |
| **HGT-149** | Lazy account prompts at Pod / calendar success moments | — |
| **HGT-92** | Was: email+phone tabs UI | Deprioritized |
| **HGT-93** | Re-scoped: SMS step-up / recovery only | Deprioritized |
| **HGT-94** | Password sign-in | Might be removed |
| **HGT-95** | Passkey / WebAuthn | Deprioritized |
| **HGT-96** | Google identity SSO | Might be removed |
| **HGT-97** | Apple Sign In | Might be removed |

HGT-78/79 remain **Canceled**; HGT-94/96 reopened under HGT-91 are deprioritized again. See [PRODUCT.md](./PRODUCT.md) §9.

### Sprint 4 — human validation (not started)

1. **HGT-17** — 5-friend mobile Safari teardown
2. **HGT-21** — OG previews in iMessage, WhatsApp, Discord, Slack
3. **HGT-27/28** — PWA install + end-to-end push on real devices
4. **HGT-29/34** — Google OAuth smoke test on production — [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md)

### Wave 4 — shipped (PR #8, May 29)

- **HGT-11/13** — Magic link at `/auth/signin` (migration `024`); **HGT-91** strategy + **HGT-148** polish
- **HGT-22** — Top-3 auto-schedule: preview `POST /schedule` → confirm with `slot_key` + `idea_id`
- **HGT-29** — Calendar busy pre-fill on plan grid (verify UI vs [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md))

### Performance & Optimization (May 31 audit)

**Guiding doc:** [PERFORMANCE.md](./PERFORMANCE.md) — workflow (continuous on sacred path, bursty on stack), agent checklist, anti-patterns. **All agents must read before touching plan routes or root layout.**

Linear project: [Performance & Optimization](https://linear.app/hangout-friends/project/performance-and-optimization-7d4bb0096259). Baseline doc: [Performance audit baseline (May 2026)](https://linear.app/hangout-friends/document/performance-audit-baseline-may-2026-e45be4a75392).

**North star:** be the fast option in group scheduling — speed is a product feature on the anonymous `/p/[slug]` path (PRODUCT.md: <1s load on 4G, <30s to mark availability).

**Critical path today:** `/p/[slug]` SSR passes `initialData` (HGT-83/87 done); ideas may still client-fetch. **Still open:** global Google Maps JS in root layout (HGT-82), below-fold lazy load (HGT-85), lightweight plan layout (HGT-86).

**Top issues filed (priority order):**

| Issue | What |
|-------|------|
| **HGT-82** | Remove global Google Maps JS from root layout |
| **HGT-83** | SSR initial poll data on `/p/[slug]` — eliminate client waterfall |
| **HGT-84** | DB indexes on `poll_responses`, `poll_rsvps`, `poll_idea_votes` |
| **HGT-85** | Lazy-load ideas board below the fold |
| **HGT-86** | Lightweight layout for `/p/*` (skip app chrome JS) |
| **HGT-87** | Deduplicate server-side DB queries on slug page |
| **HGT-89** | Slim poll GET API payload |
| **HGT-90** | Performance baseline + monitoring targets |
| **HGT-88** | Remove unused `date-fns` / `rrule` deps |

**Already good:** nav hidden on plan pages, Speed Insights wired, OG on Edge, slug index, save-as-you-go grid, lean first-party JS chunks.
