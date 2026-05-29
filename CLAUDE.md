@AGENTS.md
# CLAUDE.md

Instructions for Claude Code when working in this repo.

## Project context

Hangout is a link-first group scheduling app for college friend groups. Live at hangout-friends.vercel.app.

Before doing any non-trivial work, read these in order:
1. `docs/GOALS.md` — strategy, why we're building this, kill criteria
2. `docs/PRODUCT.md` — what the app *should* be (v1 blueprint, design principles, what's explicitly out of scope)
3. `docs/README.md` — current implementation overview and active priorities
4. `docs/AGENT_WORK.md` — if doing MVP follow-up (Sprint 4 QA or Wave 4 code); contains agent prompts
5. `docs/GOOGLE_CALENDAR.md` — if touching Calendar OAuth, pre-fill (HGT-29/34), or deferred QA

Do **not** use `docs/archive/` for current behavior — those files are historical (Nov 2025 audits, completed wave plan).

If a request conflicts with PRODUCT.md, flag the conflict before proceeding. Don't silently override the blueprint.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Supabase (Postgres + RLS, custom token auth — no Supabase Auth)
- Vercel hosting, auto-deploy on push to `main`
- Migrations in `migrations/` as numbered SQL files, run via `scripts/migrate.mjs` before every build

## Working principles

**The anonymous link flow is sacred.** The single most important user path is: stranger taps a plan link in iMessage → marks availability in mobile Safari → leaves. No account. No download. No friction. Any change that adds steps, login walls, or required fields to this flow needs explicit justification against PRODUCT.md before being made.

**Don't drift into a calendar app.** Hangout coordinates plans. It does not store users' lives. Plans expire 30 days after their date by default. Calendar sync is read-only and one-way. Resist the urge to add "calendar app" features even when they seem helpful.

**Mobile-first, every time.** Every UI change gets evaluated on a 5.5" viewport before anything else. Desktop is responsive scaling, not a separate codepath.

**Boring tech is the goal.** No new dependencies without justification. No experimental patterns. Polish over novelty.

## Things explicitly out of scope (don't suggest building these)

See PRODUCT.md "Explicitly NOT in v1" section for the full list. The big ones:

- Group chat per plan
- Social feed of friends' activity
- Native iOS/Android apps (PWA only)
- iMessage extension (deferred until v1 link flow is validated)
- Two-way calendar write-back
- Phone number requirements anywhere
- Required friend invitations to use features
- Any notification beyond the three sanctioned types in PRODUCT.md

## Code conventions

- TypeScript strict mode, no `any` unless justified in a comment
- Server-side logic in `app/api/` route handlers; client components only when interactivity requires it
- Database access goes through `lib/supabase.ts`; don't instantiate clients ad-hoc
- New tables require a numbered migration file in `migrations/`; never edit applied migrations
- Database types live in `types/database.ts` and should match the schema after every migration
- Tailwind classes only; no CSS modules, no styled-components, no inline style objects unless dynamic values require it

## Auth model (currently in flux)

Custom token system, stored in localStorage via `context/UserContext.tsx`. This predates the anonymous-first product direction and probably needs rework. When touching auth, flag whether the change is consistent with the link-first flow described in PRODUCT.md, and don't expand the current model's footprint without discussion.

## Common commands

```
npm run dev          # local dev server
npm run build        # runs migrations then builds
node scripts/migrate.mjs   # run migrations manually
```

## Required environment variables

See `docs/README.md` (environment variables). Don't commit `.env.local` or any file containing real keys.

## When making changes

- Run `npm run build` before claiming a change is done; migration errors and type errors both surface there
- For UI changes, describe how it looks on mobile (5.5" viewport) specifically, not just desktop
- Don't add new npm dependencies without explaining why an existing one doesn't suffice
- Prefer editing existing files over creating new ones; flag when a new file is genuinely needed

## When uncertain

Ask. Vague guesses produce worse outcomes than a clarifying question. Specifically ask before:

- Adding a new database table or modifying an existing schema
- Changing the auth/identity model
- Adding a new top-level route or page
- Removing code that looks unused (it might be referenced in ways static analysis misses)
- Making changes that affect the anonymous link-respond flow

## Things that have already gone wrong

*[Add to this list as you catch Claude Code making the same mistake twice.]*

- (placeholder — fill in as you go)
