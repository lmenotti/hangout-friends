# MVP Agent Prompts

> **Temporary doc** — paste each prompt into a separate Cursor agent.  
> See [MVP_AGENT_PLAN.md](./MVP_AGENT_PLAN.md) for wave order and coordination rules.

---

## How to run (coordinator checklist)

1. **Waves are sequential; agents within a wave can run in parallel** — but only when their allowed files do not overlap.
2. **Start Wave 0** — launch 3 agents at once (OG, Cleanup, Docs). Wait for all three to finish.
3. **Reconcile** — if agents edited the same branch, pull/merge their changes (Wave 0 files are disjoint, so conflicts should be rare). Run `npm run build`.
4. **Start Wave 1** — one Plan-UX agent only. Run `npm run verify:021` and `npm run test:plan-loop` (requires `npm run dev` in another terminal + Supabase env).
5. **Start Wave 2** — up to 4 agents in parallel after Wave 1 merges. Cookie-Agent must **not** start until Plan-UX-Agent is merged (both touch `PollPageClient.tsx`).
6. **Start Wave 3** — Push-Agent only after PWA-Agent (HGT-27) is merged.
7. **Wave 4** — optional tonight; 3 agents in parallel if you have capacity.
8. **Do not ask agents to git commit** unless you explicitly want that — agents should leave changes ready for you to review.
9. **Migration numbers are pre-assigned:** Expire-Agent = `022`, Push-Agent = `023`. No other agent should create migrations tonight unless coordinated.

---

## Wave 0 — Agent 1: OG-Agent (HGT-21 code)

```
You are working on the Hangout app (link-first group scheduling for college friends). Read CLAUDE.md and docs/PRODUCT.md § Core features #7 (Rich link previews) before coding.

## Goal (Linear HGT-21 — code only)
Improve plan link preview metadata and OG image generation. Platform testing in iMessage/WhatsApp is deferred to the human coordinator tomorrow — your job is to make the code correct and complete.

## Context
- Plan pages live at `/p/[slug]` (canonical) and `/polls/[id]` (redirect).
- OG images are generated at `app/api/og/route.tsx` (1200×630).
- Metadata is in `app/p/[slug]/page.tsx` — currently always shows "Mark availability" even when the plan is scheduled.

## Files you MAY edit
- `app/api/og/route.tsx`
- `app/p/[slug]/page.tsx`
- `app/polls/[id]/page.tsx` (metadata only, if needed for parity)

## Files you must NOT edit
- `app/polls/[id]/PollPageClient.tsx`
- Pod routes, auth, PWA, migrations

## Tasks
1. Extend `getPollBySlug` / metadata query to include `status`, `scheduled_at`, `scheduled_end_at`, and RSVP counts (yes/maybe/no) from `poll_rsvps`.
2. When `status === 'scheduled'`, set OG title/subtitle/CTA appropriately (e.g. show locked time, "RSVP" CTA, participant counts) instead of "Mark availability".
3. Ensure `openGraph` and `twitter` cards use absolute URLs via `NEXT_PUBLIC_BASE_URL`.
4. Keep image at 1200×630; ensure title/sub text won't truncate badly in the OG template (reasonable char limits, line clamp if needed).

## Done when
- `npm run build` passes.
- Polling plan metadata still works (shows response count + creator).
- Scheduled plan metadata reflects locked time and RSVP info in code (manual platform verify is out of scope).

## Mobile / UX
N/A (server metadata). No UI changes on plan page.

## Do not
- Add npm dependencies.
- Change the anonymous link-respond flow.
- Test in iMessage (human job tomorrow).
```

---

## Wave 0 — Agent 2: Cleanup-Agent

```
You are working on the Hangout app. Read CLAUDE.md before coding.

## Goal
Remove dead/orphaned code identified in docs/audits/051126_phase2_categorization.md. Reduce codebase noise without breaking pod features or the plan flow.

## Files you MAY edit
- `components/IdeasBoard.tsx` (delete if unused)
- `components/EventsList.tsx` (delete if unused)
- `components/CreateEventForm.tsx` (delete if unused)
- `components/ChakraProvider.tsx` (delete if exists and unused)
- `package.json` / `package-lock.json` (remove unused deps only)
- Any imports that reference deleted files

## Files you must NOT edit
- `app/polls/[id]/PollPageClient.tsx`
- Pod components (`PodIdeasTab.tsx`, `PodEventsTab.tsx`, `AvailabilityGrid.tsx`)
- Plan API routes (`app/api/polls/*`)
- Migrations

## Tasks
1. Verify with ripgrep that `IdeasBoard`, `EventsList`, `CreateEventForm`, `ChakraProvider` have zero imports in `app/` or active components.
2. Delete orphaned components.
3. Remove unused npm packages: `@chakra-ui/react`, `react-big-calendar` (and `@types/react-big-calendar` if present) — only if zero imports remain.
4. Do NOT delete global API routes (`app/api/ideas/*`, `app/api/events/*`) — pod tabs may still use them.

## Done when
- `npm run build` passes.
- `grep -r "IdeasBoard" app components` returns nothing (except maybe docs).

## Do not
- Remove pod functionality.
- Remove `/polls/*` or `/p/*` routes.
- Add new dependencies.
```

---

## Wave 0 — Agent 3: Docs-Agent

```
You are working on the Hangout app documentation only. No application code changes.

## Goal
Update docs/PRODUCT.md so Feature #5 (Auto-schedule) accurately describes the implemented algorithm, including weather and commute-aware scoring that already exists in code.

## Files you MAY edit
- `docs/PRODUCT.md` (auto-schedule section only)

## Files you must NOT edit
- Any `.ts`, `.tsx`, or SQL files

## Tasks
1. Read `lib/pollSchedule.ts` and understand the actual selection algorithm (voter overlap, 2+ votes, weather tiebreak for outdoor ideas, etc.).
2. Read `docs/audits/051126_phase3_analysis.md` Part 2 item 5 for context.
3. Replace the oversimplified auto-schedule bullet in PRODUCT.md with an accurate description matching the code.
4. Keep the doc tone consistent with the rest of PRODUCT.md. Do not add new features to scope — document what exists.

## Done when
- PRODUCT.md auto-schedule section matches `lib/pollSchedule.ts` behavior.
- No other sections changed unless needed for consistency.
```

---

## Wave 1 — Agent 4: Plan-UX-Agent (HGT-20 + heatmap)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #2, #3, #6, and docs/MVP_AGENT_PLAN.md Wave 1.

## Goal
(1) HGT-20 RSVP polish on scheduled plans. (2) PRODUCT.md #3 heatmap drill-down: tap a cell to see who's free.

## Context
- Plan page client: `app/polls/[id]/PollPageClient.tsx` (used by both `/p/[slug]` and `/polls/[id]`).
- Grid: `components/PollGrid.tsx`.
- RSVP API works (`app/api/polls/[id]/rsvp/route.ts`). UI currently shows counts only, not names.
- `GET /api/polls/[id]` returns `responses`, `aggregate`, `rsvps`.

## Files you MAY edit
- `app/polls/[id]/PollPageClient.tsx`
- `components/PollGrid.tsx`
- `app/api/polls/[id]/route.ts` (only if you need per-slot name data not already available)

## Files you must NOT edit
- Pod routes, OG routes, PWA, migrations, `context/UserContext.tsx`

## Task A — HGT-20 RSVP polish
1. Show **name lists** under yes/maybe/no (not just counts).
2. Clear **self-feedback**: highlight which button is the current user's RSVP; show their name in "who's coming".
3. Add a **"Who's coming"** summary section (yes + maybe names, or yes only — pick what reads best on mobile).
4. Keep tap targets ≥44px. No extra steps to RSVP (still one tap per status).

## Task B — Heatmap drill-down (PRODUCT #3)
1. When viewing the grid (not necessarily while editing), tapping a heatmap cell opens a small modal/sheet listing who is free and who isn't for that slot.
2. Use `responses` data already loaded (derive from each response's `availability` object + slot key format used by PollGrid).
3. Optional: toggle to filter grid to slots where ≥80% of responders are free — only if it fits cleanly; otherwise skip and note in your summary.

## Done when
- `npm run build` passes.
- On a 5.5" viewport: scheduled plan shows names per RSVP bucket; RSVP buttons are obvious; cell tap shows names.
- Do not break save-as-you-go availability or auto-schedule button.

## Do not
- Add login walls to the plan respond flow.
- Touch cookie/localStorage identity (Cookie-Agent handles that in Wave 2).
- Add npm dependencies.
```

---

## Wave 2 — Agent 5: PWA-Agent (HGT-27)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #8 (PWA), docs/README.md.

## Goal (Linear HGT-27)
Make the app installable as a PWA: manifest, icons, iOS meta tags, gentle install prompt after user has interacted with 2+ plans.

## Files you MAY edit
- `public/manifest.json` (create)
- `public/icons/*` (create — use simple branded placeholders if no design assets exist)
- `app/layout.tsx` (manifest link + apple-mobile-web-app meta only)
- New small client component for install prompt (e.g. `components/InstallPrompt.tsx`) if needed
- `app/layout.tsx` children wrapper only as needed to mount prompt

## Files you must NOT edit
- `app/polls/[id]/PollPageClient.tsx`
- Service worker / push logic (Push-Agent Wave 3)
- Migrations

## Tasks
1. Add web app manifest: name "Hangout", short_name, theme/background colors matching app (dark zinc/indigo), `display: standalone`, start_url `/`, icons 192 and 512.
2. Wire manifest in layout; ensure existing `appleWebApp` config is complete (status bar, title).
3. Install prompt: after user visits a second distinct plan (track via localStorage key like `hangout_plan_visits`), show a dismissible banner suggesting "Add to Home Screen" — not a blocking wall. Hide on plan respond pages (`lib/planRoutes.ts` `isPlanRespondPage`).
4. No service worker yet — that's Push-Agent.

## Done when
- `npm run build` passes.
- Manifest validates (reasonable JSON, icons referenced).
- Install prompt does not appear on `/p/*` or `/polls/[id]` respond pages.

## Do not
- Add `next-pwa` or other new dependencies unless absolutely necessary — prefer static manifest + meta tags.
- Add push notification code.
```

---

## Wave 2 — Agent 6: Cookie-Agent (HGT-15)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Surface 1 (anonymous cookie identity), docs/audits/051126_phase3_analysis.md Part 2 item 2.

## Goal (Linear HGT-15)
Replace global `localStorage` `poll_name` with a **per-plan** httpOnly cookie so anonymous responders are remembered on the same device (including iMessage in-app browser → Safari).

## Prerequisite
Plan-UX-Agent (Wave 1) must be merged before you start — you will edit `PollPageClient.tsx`.

## Files you MAY edit
- `lib/planIdentity.ts` (create — cookie name helpers, read/write utilities)
- `app/api/polls/[id]/respond/route.ts` (set cookie on respond)
- `app/api/polls/[id]/route.ts` (optional: return whether cookie matches)
- `app/polls/[id]/PollPageClient.tsx` (read identity via API or initial props — avoid localStorage for name)

## Files you must NOT edit
- `context/UserContext.tsx` (signed-in token system — out of scope)
- Migrations (unless absolutely required — prefer cookie-only, no DB change)
- Pod routes

## Tasks
1. Cookie name pattern: e.g. `hangout_plan_{pollId}` or hashed poll id — stores respondent name for that plan only.
2. On successful `POST /api/polls/[id]/respond`, set httpOnly, Secure (prod), SameSite=Lax cookie.
3. On plan page load, if cookie present, pre-fill name and load that respondent's availability without re-prompting.
4. Remove reliance on `localStorage.getItem('poll_name')` for plan respond flow.
5. First-name-only, no account required — consistent with PRODUCT.md.

## Done when
- `npm run build` passes.
- Responding with a name sets cookie; reloading plan page restores name + grid selection.
- Anonymous link flow still works with zero account creation.

## Do not
- Expand to global auth or magic link (Auth-Agent is Wave 4).
- Require phone numbers or extra fields.
```

---

## Wave 2 — Agent 7: Expire-Agent (plan expiration)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md Design principle #4 (Plans expire 30 days after scheduled date).

## Goal
Implement automatic plan archival/expiration. `polls.expires_at` column already exists (see migrations/013_polls.sql).

## Files you MAY edit
- `migrations/022_plan_expiration.sql` (create — YOU own migration 022)
- `app/api/cron/expire-plans/route.ts` (create)
- `app/api/polls/route.ts` (ensure new plans set `expires_at` if not already — 30 days after last date in `date_options` or after scheduled event date)
- `types/database.ts` (if schema changes)
- `vercel.json` (cron schedule) if file exists or create it

## Files you must NOT edit
- `PollPageClient.tsx`
- Push service worker

## Tasks
1. Migration 022: add `archived_at timestamptz` to `polls` (or use status enum value `archived`) — pick minimal approach.
2. Cron route (secured with `CRON_SECRET` env var or Vercel cron header): find polls where `expires_at < now()` and not yet archived; set archived.
3. Plan pages for archived polls: return friendly "this plan has expired" — update `app/p/[slug]/page.tsx` or API to handle gracefully.
4. Ensure create flow sets sensible `expires_at` (30 days after event date once scheduled, or 30 days after last poll date while polling).

## Done when
- `npm run build` passes (migration runs cleanly).
- Cron route is idempotent and safe to run daily.
- Document required env var in code comment (not necessarily README).

## Do not
- Hard-delete poll data.
- Use migration number other than 022.
```

---

## Wave 2 — Agent 8: Calendar-Agent (HGT-29/34)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #11, docs/README.md § Google Calendar OAuth.

## Goal (Linear HGT-29/34)
Greenfield rewrite of Google Calendar read-only sync. The existing `lib/googleCalendar.ts` is broken — rewrite from scratch.

## Prerequisite
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be in `.env.local` for local testing. OAuth is prod + localhost only (no Vercel preview).

## Files you MAY edit
- `lib/googleCalendar.ts` (rewrite)
- `app/api/google/auth/route.ts` (create)
- `app/api/google/callback/route.ts` (create)
- `app/api/calendar/sync/route.ts` (fix or create — read busy blocks)
- `app/profile/page.tsx` (connect/disconnect UI)
- `types/database.ts` (use existing google token columns from migration 012)

## Files you must NOT edit
- `PollPageClient.tsx` (pre-fill integration can be a follow-up — focus on OAuth + read path working)
- Migrations (use existing token columns)
- Pod routes

## Tasks
1. OAuth start: `GET /api/google/auth` redirects to Google with `calendar.readonly` scope; redirect URI `${NEXT_PUBLIC_BASE_URL}/api/google/callback`.
2. Callback: exchange code, store `google_access_token`, `google_refresh_token`, expiry on `users` row for authenticated user (x-user-token header pattern used elsewhere).
3. `listBusyTimes(userId, timeMin, timeMax)` — return busy intervals from primary calendar.
4. Profile page: "Connect Google Calendar" / "Disconnect" buttons; show connection status.
5. Read-only only — never write events to Google Calendar.

## Done when
- `npm run build` passes.
- OAuth flow compiles and routes exist (manual OAuth test is human job tomorrow).
- `lib/googleCalendar.ts` has no syntax errors and uses correct DB column names (`google_refresh_token` not `user.google.refresh_token`).

## Do not
- Add two-way calendar write-back.
- Add Apple/Outlook integration.
- Add new npm dependencies beyond existing `googleapis`.
```

---

## Wave 3 — Agent 9: Push-Agent (HGT-28)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #8 (three notification types ONLY).

## Prerequisite
PWA-Agent (HGT-27) must be merged first — manifest and layout meta must exist.

## Goal (Linear HGT-28)
Web Push with strict allowlist of exactly 3 notification types:
1. Someone responded to a plan you created
2. Your plan was auto-scheduled
3. An event you RSVP'd yes to is happening tomorrow

## Files you MAY edit
- `migrations/023_push_subscriptions.sql` (create — YOU own migration 023)
- `public/sw.js` or `public/sw.ts` (service worker)
- `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts` (create)
- `lib/pushNotifications.ts` (create — allowlisted dispatcher)
- `app/api/polls/[id]/respond/route.ts` (trigger type 1)
- `app/api/polls/[id]/schedule/route.ts` (trigger type 2)
- `app/api/cron/event-reminders/route.ts` (trigger type 3 — tomorrow's events)
- `types/database.ts`
- `app/layout.tsx` (register service worker — minimal addition)

## Files you must NOT edit
- Pod notification settings
- Plan page UI beyond SW registration

## Tasks
1. Migration 023: `push_subscriptions` table (endpoint, keys, user_id or anonymous device id, created_at).
2. Service worker handles push + notificationclick (open relevant plan URL).
3. `sendPush(type, payload)` checks allowlist enum — reject unknown types at compile/runtime.
4. Wire the 3 triggers listed above. No other notification types anywhere.
5. Use Web Push VAPID keys — read from env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`); document in code comment. Generate instructions in agent summary if keys missing.

## Done when
- `npm run build` passes.
- Grep for notification send sites shows only the 3 allowed types.
- No email notifications added.

## Do not
- Add a 4th notification type.
- Add friend-activity or availability-update notifications.
- Add new npm dependencies unless web-push is already present — check package.json first; justify if adding.
```

---

## Wave 4 — Agent 10: Auth-Agent (HGT-11/13) — optional

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #9, docs/README.md Auth section.

## Goal (Linear HGT-11/13)
Add optional email + magic link account creation. Reduce reliance on global NameModal for signed-in features. Anonymous plan respond flow must remain untouched.

## Prerequisite
Cookie-Agent (HGT-15) should be merged first.

## Files you MAY edit
- `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/magic-link/page.tsx` (create if missing)
- `app/api/auth/*` (magic link send + verify routes)
- `context/UserContext.tsx` (integrate magic link session alongside existing token)
- `components/NameModal.tsx` (narrow when it appears — not on plan pages per `lib/planRoutes.ts`)

## Files you must NOT edit
- `PollPageClient.tsx` respond flow
- Pod business logic

## Tasks
1. Magic link flow: user enters email → receives link → click sets session token (reuse or extend existing users table).
2. No phone number, no password required for magic link path.
3. NameModal should not block `/p/*` or `/polls/*` (already handled — don't regress).
4. Sign-in accessible from profile/nav for users who want accounts.

## Done when
- `npm run build` passes.
- Plan link respond flow still works with first name only, no account.

## Do not
- Require account for any plan feature.
- Add Supabase Auth as dependency — use existing custom token pattern unless migration is explicitly approved.
```

---

## Wave 4 — Agent 11: ICS-Agent — optional

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md build order #8 (ICS export).

## Goal
One-shot "Add to calendar" for scheduled plans — ICS download or data URL. No Google write-back.

## Prerequisite
Plan-UX-Agent merged (scheduled UI exists).

## Files you MAY edit
- `app/api/polls/[id]/ics/route.ts` (create)
- `app/polls/[id]/PollPageClient.tsx` (add "Add to calendar" button in scheduled section only)

## Files you must NOT edit
- Google OAuth routes
- Migrations

## Tasks
1. `GET /api/polls/[id]/ics` returns `text/calendar` with plan title, scheduled start/end, location from scheduled idea if available.
2. Button on scheduled plan card triggers download (`.ics` filename from plan title slug).
3. Works without user account.

## Done when
- `npm run build` passes.
- ICS validates in a standard calendar app (agent can sanity-check file format).

## Do not
- Write to Google Calendar API.
- Add dependencies — generate ICS as plain text.
```

---

## Wave 4 — Agent 12: Schedule-UX-Agent (HGT-22) — optional

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #5, `lib/pollSchedule.ts`.

## Goal (Linear HGT-22)
Instead of silently picking one slot, show top 3 auto-schedule candidates and let the creator pick.

## Files you MAY edit
- `lib/pollSchedule.ts` (return ranked candidates, not just winner)
- `app/api/polls/[id]/schedule/route.ts` (accept optional `slot_key` + `idea_id` to lock specific choice)
- `app/polls/[id]/PollPageClient.tsx` (UI to display 3 options with scores/reasons, then confirm)

## Files you must NOT edit
- Pod auto-schedule
- Migrations

## Tasks
1. Extend scheduler to return top 3 `(slot, idea)` pairs with human-readable reasons (e.g. "4/5 free, Saturday 2pm, Dinner").
2. UI: after clicking "Auto-schedule", show picker; confirm locks plan same as current schedule endpoint.
3. Mobile-first: stack cards vertically, 44px tap targets.

## Done when
- `npm run build` passes.
- `npm run test:plan-loop` still passes (update test if it expects immediate schedule — or add optional two-step flow backward compatible).

## Do not
- Change algorithm fundamentals (2+ votes, voters free) without documenting.
- Add dependencies.
```

---

## After all waves (coordinator)

```bash
npm run build
npm run verify:021
npm run test:plan-loop   # requires npm run dev + Supabase env
```

Tomorrow (human): HGT-17, HGT-21 platform verify, device PWA/push test, Google OAuth on prod.
