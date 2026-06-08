# Agent work — MVP status & prompts

**Last updated:** June 1, 2026  
**Linear:** [hangout-friends](https://linear.app/hangout-friends)

This is the single doc for **what to build next** and **copy-paste agent prompts**. Strategy and blueprint live in [GOALS.md](./GOALS.md) and [PRODUCT.md](./PRODUCT.md). Implementation details and env vars live in [README.md](./README.md).

---

## Where we are

| Track | Status |
|-------|--------|
| **Waves 0–3** (MVP code) | **Done** — link shell, plan loop, OG, PWA, cookies, expiration, calendar OAuth, push, ICS |
| **Sprint 4** (human validation) | **Not started** — see checklist below |
| **Wave 4** (optional code) | **Done** — top-3 scheduler, magic link auth (HGT-11/13), calendar pre-fill |
| **Account sign-in (v1)** | **Active** — HGT-91 magic link first; HGT-148 polish, HGT-149 lazy prompts; HGT-92–97 deprioritized in Linear |
| **Data protection** | **Backlog** — [PRIVACY.md](./PRIVACY.md); **HGT-150** (encrypt OAuth secrets, hash tokens, retention) |

Do not re-run archived Wave 0–3 agent prompts ([archive/mvp-agent/](./archive/mvp-agent/)).

---

## Active — account sign-in (HGT-91)

**Strategy (Jun 2026):** Research review + GOALS wedge → **one** primary sign-in (email magic link), lazy account prompts, step-up SMS only for high-risk actions later. May 2026 “multi-method” plan is **not** the v1 path. See [PRODUCT.md](./PRODUCT.md) §9. Sacred `/p/*` flow unchanged.

**Linear sync:** `node scripts/linear-auth-strategy-jun2026.mjs` (tags *Deprioritized* / *Might be removed* on HGT-92–97 without deleting issues).

| Linear | Title | Status | Notes |
|--------|-------|--------|-------|
| **HGT-91** | Account sign-in strategy (v1) — magic link first | Todo | Parent |
| **HGT-148** | Polish email magic-link sign-in UX | Todo | **Do first** — near-term v1 |
| **HGT-149** | Lazy account prompts at success moments | Backlog | After M1 validation OK |
| **HGT-92** | Sign-in UI: primary + options page | Backlog | **Deprioritized** — do not build phone tabs |
| **HGT-93** | Phone number (SMS OTP) | Backlog | **Deprioritized** — re-scope: step-up/recovery only |
| **HGT-94** | Password sign-in | Backlog | **Might be removed** |
| **HGT-95** | Passkey / WebAuthn | Backlog | **Deprioritized** — medium-term |
| **HGT-96** | Google SSO | Backlog | **Might be removed** (Calendar OAuth ≠ this) |
| **HGT-97** | Apple Sign In | Backlog | **Might be removed** |

**Suggested order:** HGT-148 (magic link polish) → HGT-149 (lazy prompts) → M1/Sprint 4 before HGT-93/95. Do **not** prioritize HGT-92/94/96/97 unless product direction changes.

**Coordination rules**

1. One migration number per agent if schema changes.
2. Session remains `gs_token` (`context/UserContext.tsx`).
3. Use HTML `autocomplete` / `inputMode` on auth inputs (HGT-148).
4. **Done when:** `npm run build` passes; `/p/*` respond still works with first name only.
5. Do not require account, phone, or email on plan respond path.
6. Do not add co-primary SMS or password to `/auth/signin` without explicit PRODUCT.md change.

---

## Sprint 4 — human validation (coordinator, not agents)

Run these **before** treating MVP as release-ready. File bugs in Linear; fix blockers before new features.

| # | Linear | What to do |
|---|--------|------------|
| 1 | **HGT-17** | 5 friends, cold mobile Safari: send `/p/[slug]`, no help, everyone marks availability in &lt;30s |
| 2 | **HGT-21** | Drop plan links in iMessage, WhatsApp, Discord, Slack; fix any broken OG previews |
| 3 | **HGT-27/28** | Real device: add-to-home-screen, subscribe to push, verify delivery for all 3 allowlisted types |
| 4 | **HGT-29/34** | Production Google OAuth connect + busy fetch — [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md) |

**Automated checks** (run locally before/after fixes):

```bash
npm run build
npm run verify:021
npm run test:plan-loop   # needs npm run dev + Supabase env
```

---

## Wave 4 — optional code (agents)

Parallel-safe when files do not overlap. One agent owns `PollPageClient.tsx` at a time.

| Linear | Title | Status | Notes |
|--------|-------|--------|-------|
| **HGT-11/13** | Email + magic link auth | **Done** | Magic link only; removed NameModal, `POST /api/users`, `/api/users/check` |
| **HGT-22** | Top-3 auto-schedule picker | Done | `findTopPollScheduleCandidates`, two-step `/api/polls/[id]/schedule`, picker in `PollPageClient` |
| **HGT-30** | ICS export | **Done** | Skip unless fixing bugs |
| **HGT-29** | Calendar pre-fill on plan grid | Done (OAuth); **UI wiring** may still be needed | Verify in code before building duplicate work — see [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md) |

**Coordination rules**

1. One migration number per agent if schema changes; coordinate in chat.
2. `PollPageClient.tsx` — single owner per wave (Schedule-UX-Agent for HGT-22).
3. **Done when:** `npm run build` passes; `npm run test:plan-loop` if touching schedule flow.
4. Pod surface is **frozen** — bugfixes only if blocking.
5. Anonymous link respond flow is sacred — no account wall on `/p/*` or respond path.

---

## Wave 4 — Agent prompts (copy-paste)

### Auth-Agent (HGT-11 / HGT-13)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #9, docs/README.md Auth section.

## Goal (Linear HGT-11/13)
Add optional email + magic link account creation. Reduce reliance on global NameModal for signed-in features. Anonymous plan respond flow must remain untouched.

## Prerequisite
HGT-15 (per-plan cookie) is shipped — do not break it.

## Files you MAY edit
- app/auth/signin/page.tsx, app/auth/signup/page.tsx, app/auth/magic-link/page.tsx (create if missing)
- app/api/auth/* (magic link send + verify routes)
- context/UserContext.tsx (integrate magic link session alongside existing token)
- components/NameModal.tsx (narrow when it appears — not on plan pages per lib/planRoutes.ts)

## Files you must NOT edit
- PollPageClient.tsx respond flow
- Pod business logic

## Tasks
1. Magic link flow: user enters email → receives link → click sets session token (reuse or extend existing users table).
2. No phone number, no password required for magic link path.
3. NameModal should not block /p/* or /polls/* (already handled — don't regress).
4. Sign-in accessible from profile/nav for users who want accounts.

## Done when
- npm run build passes.
- Plan link respond flow still works with first name only, no account.

## Do not
- Require account for any plan feature.
- Add Supabase Auth as dependency — use existing custom token pattern unless migration is explicitly approved.
```

### Schedule-UX-Agent (HGT-22)

```
You are working on the Hangout app. Read CLAUDE.md, docs/PRODUCT.md § Core features #5, lib/pollSchedule.ts.

## Goal (Linear HGT-22)
Instead of silently picking one slot, show top 3 auto-schedule candidates and let the creator pick.

## Files you MAY edit
- lib/pollSchedule.ts (return ranked candidates, not just winner)
- app/api/polls/[id]/schedule/route.ts (accept optional slot_key + idea_id to lock specific choice)
- app/polls/[id]/PollPageClient.tsx (UI to display 3 options with scores/reasons, then confirm)

## Files you must NOT edit
- Pod auto-schedule
- Migrations

## Tasks
1. Extend scheduler to return top 3 (slot, idea) pairs with human-readable reasons (e.g. "4/5 free, Saturday 2pm, Dinner").
2. UI: after clicking "Auto-schedule", show picker; confirm locks plan same as current schedule endpoint.
3. Mobile-first: stack cards vertically, 44px tap targets.

## Done when
- npm run build passes.
- npm run test:plan-loop still passes (update test if it expects immediate schedule).

## Do not
- Change algorithm fundamentals (2+ votes, voters free) without documenting in PRODUCT.md.
- Add dependencies.
```

---

## Explicitly out of scope (Wave 4)

Per [PRODUCT.md](./PRODUCT.md) and [GOALS.md](./GOALS.md):

- Pod feature expansion
- Notification types beyond the three sanctioned types
- Phone-number auth
- Two-way calendar write-back
- iMessage extension

Post-MVP ideas: [ROADMAP.md](./ROADMAP.md)
