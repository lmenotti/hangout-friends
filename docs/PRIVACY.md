# Hangout — Privacy & data protection

> How we handle user/plan data, what “encrypted in the database” would actually mean, and what to build next.  
> Last updated: June 2026

Companion to [PRODUCT.md](./PRODUCT.md) (design principles: anonymous-first, no surveillance vibes) and [README.md](./README.md) (RLS, service role).

---

## If you see raw rows in the Supabase dashboard

That is **expected for project operators** (you, with dashboard or `SUPABASE_SERVICE_ROLE_KEY` access). The Table Editor and service role **bypass Row Level Security (RLS)** — same as our API routes via `supabaseAdmin` in `lib/supabase.ts`.

That is **not** what a stranger gets from the public anon key:

- Migration **026 (HGT-109)** removed anon `SELECT` on `users` (emails, session tokens, Google OAuth fields).
- Plan tables still allow **intentional** public read for the link-first flow (anyone with the plan URL can see plan title, first names on the grid, ideas).

**Privacy for users** = minimize what we collect + block unauthorized API access + protect secrets at rest + delete/archive on schedule.  
**Privacy from operators** = policy, access control, and (optional) harder-to-read storage for the most sensitive columns — not hiding first names from people on the same plan link.

---

## Threat model (proportionate for Hangout)

| Threat | Mitigation today | Gaps / backlog |
|--------|------------------|----------------|
| Random internet user reads all emails via PostgREST | RLS: no anon read on `users` (026) | Keep all mutations on API routes with service role only |
| Leaked `SUPABASE_SERVICE_ROLE_KEY` | Server-only env; never `NEXT_PUBLIC_*` | Key rotation runbook; Vercel sensitive env |
| Leaked DB backup / Supabase project compromise | Supabase **disk encryption at rest** (platform) | App-level encryption for OAuth refresh tokens (see HGT-150) |
| Plan link holder sees participants | **By design** — first names + availability on shared plan | Don’t put email/phone on plan rows |
| Operator browses prod data | Dashboard access | Minimize prod browsing; future admin masking; see below |
| Account holder wants data gone | — | Export + delete account (not v1) |

We are **not** a bank or health app. Full field-level encryption of every string (plan titles, “dinner Saturday”, first names) would hurt the product, complicate search/heatmap, and still decrypt in the app for anyone authorized to view the plan.

---

## Data inventory (what sits in Postgres)

| Data | Table / column | Sensitivity | Needed for | Stored as |
|------|----------------|-------------|------------|-----------|
| Account email | `users.email` | **High** (PII) | Magic-link sign-in | Plaintext + unique index on `lower(email)` |
| Session token | `users.token` | **Critical** | `gs_token` session | Plaintext |
| Display name | `users.name` | Low–medium | Profile, creator label | Plaintext |
| Google OAuth tokens | `users.google_*` | **Critical** | Calendar busy read | Plaintext (012) |
| Magic-link OTP | `magic_link_tokens.token`, `.email` | Medium | One-time sign-in (~15 min) | Plaintext |
| Plan title, dates | `polls.*` | Low | Coordination | Plaintext |
| Respondent first name | `poll_responses.respondent_name`, ideas/RSVP names | Low–medium | **Visible to everyone on the plan** | Plaintext — **not** “anonymous” to the group |
| Availability grid | `poll_responses.availability` | Low–medium | Scheduling | JSONB |
| Push endpoint | `push_subscriptions` | Medium | Web Push | Endpoint + keys |

**Sacred-path rule:** responders never give email/phone on `/p/*` — only a **first name** scoped to that plan ([PRODUCT.md](./PRODUCT.md) § Surface 1).

---

## Encryption vs anonymization (use the right tool)

| Technique | Good for Hangout when… | Poor fit when… |
|-----------|------------------------|----------------|
| **Don’t collect it** | Email on plan respond path | You need magic link |
| **RLS + API-only writes** | Blocking bulk exfil via anon key | Operator dashboard view |
| **Platform encryption at rest** | Always (Supabase/AWS) | You assume dashboard rows are “hidden” |
| **Hash irreversible secrets** | Session tokens, magic-link tokens in DB | You need to display the value |
| **App-level encrypt (AES-GCM + env key)** | Google refresh tokens, optional email vault | Every poll title / first name |
| **Pseudonymize / “anonymize”** | Analytics aggregates | Plan participants still need to see “Alex” on the grid |
| **Archive then hard-delete** | Expired plans (30-day policy) | Today we only set `archived_at` (022) — data remains |

**Anonymization** in research often means “no stable identity across sessions.” Hangout already does that for responders (per-plan cookie, first name only, no cross-plan tracking). **Encrypting** first names would not make plans anonymous to the friend group — it would only obscure data from *you* in the dashboard while the app still decrypts for viewers.

---

## Current posture (honest)

**Strengths**

- Minimal PII on the sacred path (first name only).
- Optional accounts; email only when user chooses sign-in.
- RLS tightened (020, 026); sensitive tables deny anon PostgREST.
- Plans expire; cron sets `archived_at` ([expire-plans](../app/api/cron/expire-plans/route.ts)).
- Google Calendar: read-only scope; separate from identity login ([GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md)).

**Known gaps (prioritized backlog — [HGT-150](https://linear.app/hangout-friends/issue/HGT-150))**

1. **Google refresh tokens** in plaintext columns — highest-value encrypt-at-rest target.
2. **`users.token`** session secret in plaintext — should be stored hashed (lookup by hash on API auth).
3. **`magic_link_tokens.token`** — store hash only; short TTL + cron purge of expired rows.
4. **Retention** — archived plans/responses still in DB; add hard-delete after grace period if policy requires true removal.
5. **Account deletion** — no self-serve “delete my account” yet (post-v1).
6. **Operator hygiene** — document: no casual prod Table Editor browsing; use admin PIN routes only.

We do **not** plan v1 **application-level encryption** of `respondent_name` or plan titles.

---

## Recommended roadmap

### Near-term (proportionate, pre-scale)

- [ ] Encrypt `google_refresh_token` (and related secrets) before insert; decrypt only in `lib/googleCalendar.ts` (env `TOKEN_ENCRYPTION_KEY`).
- [ ] Store hashed `users.token` and `magic_link_tokens.token`; verify with constant-time compare.
- [ ] Cron: delete `magic_link_tokens` where `expires_at < now()`.
- [ ] Document operator access; restrict Supabase project members.

### Medium-term

- [ ] Hard-delete poll data N days after `archived_at` (configurable retention).
- [ ] Account export + delete (email erasure, unlink Google).
- [ ] Optional: blind index / HMAC for email lookup if regulatory pressure increases (complex with magic link).

### Explicitly out of scope (unless product changes)

- Encrypting plan content so operators cannot read it (conflicts with support/debug and negligible benefit vs access control).
- Replacing first names with opaque IDs on the plan UI.
- Storing phone numbers before step-up auth is defined ([HGT-93](https://linear.app/hangout-friends/issue/HGT-93)).

---

## For agents

Before adding columns that hold PII or secrets:

1. Read this doc and [PRODUCT.md](./PRODUCT.md) § “No surveillance vibes”.
2. Prefer **not storing** over encrypting.
3. New secrets → encrypt or hash at application layer; never log plaintext.
4. Do not re-enable anon `SELECT` on `users` or token tables.
5. Run Supabase security advisors after schema changes (`get_advisors` MCP or dashboard).

---

## References

- RLS: [README.md](./README.md) § Database / migration 026  
- Auth (email only): [PRODUCT.md](./PRODUCT.md) §9  
- Linear: **HGT-109** (RLS), **HGT-150** (data protection hardening)
