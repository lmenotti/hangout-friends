# Performance — guiding principles & workflow

> **Speed is a product feature, not a polish pass.** Hangout wins by being the fastest way to coordinate one hangout — the "Zed vs VS Code" of group scheduling. If the link-first respond path feels slow, nothing else matters.
>
> Linear project: [Performance & Optimization](https://linear.app/hangout-friends/project/performance-and-optimization-7d4bb0096259) · Audit baseline: [May 2026 doc](https://linear.app/hangout-friends/document/performance-audit-baseline-may-2026-e45be4a75392)

---

## Why this doc exists

PRODUCT.md requires the plan landing page to **load in <1s on 4G** and the respond flow to complete in **<30s**. Friction isn't just UX — latency *is* accessibility. Every unnecessary script, fetch, or login wall on `/p/[slug]` pushes users back to When2Meet or group-chat chaos.

**Agents and contributors:** read this before implementing anything that touches the plan link flow, root layout, API routes for polls, or database schema for poll tables. When in doubt, choose the faster path and file a Linear issue if you had to compromise.

---

## The sacred path

The single most performance-sensitive surface:

```
Stranger taps /p/[slug] in iMessage
  → mobile Safari loads the page
  → sees plan name + "mark availability" immediately
  → enters first name, taps/drags grid
  → each tap saves without a submit button
  → leaves (no account)
```

**Key files** (treat changes here as high-risk):

| Area | Files |
|------|-------|
| Plan URL | `app/p/[slug]/page.tsx` |
| Plan UI | `app/polls/[id]/PollPageClient.tsx`, `components/PollGrid.tsx` |
| Plan API | `app/api/polls/[id]/route.ts`, `app/api/polls/[id]/respond/route.ts` |
| Shared chrome | `app/layout.tsx`, `context/UserContext.tsx`, `lib/planRoutes.ts` |

Non-sacred surfaces (pods, auth, admin, calendar OAuth) should **not regress** budgets but don't need deep optimization until usage proves they matter.

---

## Workflow: continuous on the wedge, bursty on the stack

Don't optimize everything incrementally (slows velocity) or wait for a giant sweep (lets the core path rot). Use a **tiered hybrid**:

| What | When | Examples |
|------|------|----------|
| **Sacred-path guardrails** | Every PR that touches `/p/*`, grid, or poll APIs | No new third-party scripts; no client fetch before first paint |
| **Monitoring** | Weekly glance or after deploy | Vercel Speed Insights, one Lighthouse run on a real plan URL |
| **Small wins** | Ship immediately if <2h and clearly helps sacred path | Remove unused global scripts, add a missing index |
| **Structural bursts** | Every 4–8 weeks, 2–5 focused days | SSR initial poll data, lightweight `/p/*` layout, query dedup |
| **Sweep lite** | After a version milestone, 1–2 days | Re-run audit checklist, kill dead deps, file new issues |

### Weekly check (~30 min, not a rewrite)

1. Glance at Speed Insights for `/p/[slug]` regressions
2. If something broke, fix or file in [Performance & Optimization](https://linear.app/hangout-friends/project/performance-and-optimization-7d4bb0096259)
3. Pick **at most one** small fix; defer structural work to the next burst

### Decision heuristic

```
Does this change touch /p/[slug] or grid save?
  YES → measure impact; block regressions before merge
  NO  → don't make things worse; optimize in next burst if backlog says so

Is the fix <2 hours and clearly wins on sacred path?
  YES → do it now
  NO  → file a Linear issue; batch in next burst

Are we pre- or post-validation of the link flow?
  PRE  → weight perf higher than new features on non-core surfaces
  POST → weight retention features, but never slow down /p/[slug]
```

---

## Targets (proposed)

| Metric | Target | Surface |
|--------|--------|---------|
| LCP | <2.5s (goal <1.8s) | `/p/[slug]` mobile 4G |
| INP | <200ms | Grid tap / drag |
| TTI after HTML | <2s | Plan respond |
| Plan API p95 | <300ms | `GET /api/polls/[id]` |
| Third-party JS on `/p/*` | **0** | Anonymous plan links |

---

## Agent checklist — before merging

Use this for **any** PR. Mandatory review for sacred-path files:

- [ ] **No new third-party scripts** on root layout or plan routes (Maps, analytics extras, widgets)
- [ ] **No new required client fetch** before plan title/grid can render (prefer SSR / `initialData`)
- [ ] **No new login wall or modal** on `/p/[slug]` without explicit PRODUCT.md justification
- [ ] **Client components only where interactivity requires** — don't `'use client'` a whole page for one button
- [ ] **New DB queries have indexes** on foreign keys used in `WHERE` / `JOIN` (especially `poll_id`)
- [ ] **No `select('*')`** when a slim column list suffices on hot paths
- [ ] **Below-fold content lazy-loaded** (ideas board, heavy modals) — don't block grid interactivity
- [ ] **New npm dependency justified** — prefer existing stack; check bundle impact
- [ ] **`npm run build` passes** after changes

If you can't satisfy an item, say so in the PR and link a Linear issue.

---

## Anti-patterns (do not introduce)

These came from the May 2026 audit and represent the kind of mistakes that accumulate when perf is deferred:

1. **Global scripts for route-specific features** — e.g. Google Maps in `app/layout.tsx` when only `PlacesInput` needs it
2. **Client-only data waterfall** — server knows the slug/id but client refetches everything before showing UI
3. **Eager below-fold fetching** — ideas, calendar, push prompts blocking the availability grid
4. **Full app chrome on plan links** — auth provider, nav, install prompts bundled/hydrated when hidden
5. **Duplicate server queries** — `generateMetadata` + page + client API hitting the same tables
6. **Unindexed hot-path tables** — `poll_responses`, `poll_rsvps`, `poll_idea_votes` queried on every plan load
7. **Premature micro-optimization elsewhere** — tuning pods while `/p/[slug]` still shows a loading skeleton

---

## Current backlog (starting point)

See [docs/README.md](./README.md) § Performance & Optimization for the full issue list (HGT-82–HGT-90).

**Shipped (May 2026 — see README shipped table):** HGT-83 (SSR `initialData` on `/p/[slug]`), HGT-84/88/110/112 (indexes, trim deps, auto-schedule query scope), HGT-87 (dedupe slug lookup via `cache()`).

**Still open / next:**

1. **HGT-82** — Remove global Google Maps JS from root layout (load only where `PlacesInput` is used)
2. **HGT-85** — Lazy-load ideas board below the fold
3. **HGT-86** — Lightweight layout for `/p/*` (skip app chrome JS)
4. **HGT-89** — Slim poll GET API payload
5. **HGT-90** — Performance baseline + monitoring targets

---

## Verification

After perf-related changes:

1. `npm run build`
2. Network tab on `/p/[slug]`: no unexpected third-party requests; minimal blocking fetches before paint
3. Mobile 5.5" viewport: grid tap feels instant; save-as-you-go still works
4. Update Linear issue + this doc/README if targets or workflow change
