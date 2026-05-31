# Google Calendar integration — status & testing

Last updated: May 2026. Source of truth for OAuth implementation and deferred QA.

See also: [README.md](./README.md) (env vars, GCP setup), [PRODUCT.md](./PRODUCT.md) §11 (product intent).

---

## Linear issues (recommended board updates)

Update manually in [Linear](https://linear.app/hangout-friends) (or `node scripts/linear-sync-status.mjs` if `LINEAR_API_KEY` is set):

| Issue | Suggested status | Notes |
|-------|------------------|-------|
| **HGT-34** | **Done** / In Review | OAuth + token storage + Profile connect/disconnect shipped on `main`. Localhost verified. Production smoke test deferred. |
| **HGT-29** | **Done** (verify UI) | OAuth + `listBusyTimes` shipped; confirm plan grid pre-fill in UI before re-implementing. |
| **HGT-30** | **Done** | ICS export — `/api/polls/[id]/ics` (cloud agent, merged to `main`). |

---

## What is implemented (on `main`)

| Piece | Location |
|-------|----------|
| OAuth helpers + Calendar read | `lib/googleCalendar.ts` (`encodeOAuthState`, `listBusyTimes`, `listBusyTimesCached`, `watchCalendar`, `stopCalendarWatch`, `invalidateBusyCache`, …) |
| Auth redirect | `GET /api/google/auth` — `gs_token` cookie |
| Callback | `GET /api/google/callback` — stores `users.google_*` (migration `012`); starts push watch |
| Sync API | `GET/DELETE /api/calendar/sync` — connection status, cached busy intervals, disconnect + stop watch |
| Webhook receiver | `POST /api/google/webhook` — receives Google push notifications; invalidates busy cache |
| Watch renewal cron | `GET /api/cron/renew-calendar-watches` — daily at 02:00 UTC; renews channels expiring in <24h |
| Profile UI | `/profile` — connect, disconnect, OAuth redirect messages |
| User API | `GET/POST/PATCH /api/users` — `google_calendar_connected` flag; tokens never returned |

### Push notification (webhook) flow

1. User connects Google Calendar → OAuth callback calls `watchCalendar(userId)` (best-effort, non-blocking)
2. `watchCalendar` registers `POST /api/google/webhook` with Google's Watch API; stores `channel_id` + `resource_id` in `google_calendar_channels` (migration `025`)
3. User's Google Calendar changes → Google POSTs to `/api/google/webhook` → we verify `x-goog-channel-id` against DB → call `invalidateBusyCache(userId)` (sets `google_busy_cached_at = null`)
4. Next plan page load → `GET /api/calendar/sync?timeMin=...&timeMax=...` → `listBusyTimesCached` sees stale/missing cache → re-fetches from Google → updates cache
5. Subsequent requests within 1 hour return cached data without hitting Google's API
6. User disconnects → `stopCalendarWatch` calls `channels.stop` (needs valid tokens) then deletes DB record; `clearGoogleTokens` removes stored credentials

### Push notification (webhook) flow

1. User connects Google Calendar → OAuth callback calls `watchCalendar(userId)` (best-effort, non-blocking)
2. `watchCalendar` registers `POST /api/google/webhook` with Google's Watch API; stores `channel_id` + `resource_id` in `google_calendar_channels` (migration `025`)
3. User's Google Calendar changes → Google POSTs to `/api/google/webhook` → we verify `x-goog-channel-id` against DB → call `invalidateBusyCache(userId)` (sets `google_busy_cached_at = null`)
4. Next plan page load → `GET /api/calendar/sync?timeMin=...&timeMax=...` → `listBusyTimesCached` sees stale/missing cache → re-fetches from Google → updates cache
5. Subsequent requests within 1 hour return cached data without hitting Google's API
6. User disconnects → `stopCalendarWatch` calls `channels.stop` (needs valid tokens) then deletes DB record; `clearGoogleTokens` removes stored credentials

**Scope:** `calendar.readonly` + `userinfo.profile` (profile scope used to upgrade display names on connect when the name was email-derived)
**Policy:** OAuth on **production + localhost** only (not Vercel Preview). See README.

### Verified (localhost)

- [x] Connect flow end-to-end
- [x] Profile shows Connected
- [x] Tokens in Supabase

### Not implemented / deferred

- [ ] Production OAuth smoke test
- [ ] Pre-fill plan availability grid from busy blocks (HGT-29)
- [ ] 1h cache per PRODUCT.md

---

## Deferred testing checklist

### Production OAuth

- [ ] Redeploy after env vars
- [ ] Sign in on production → Profile → Connect (GCP test user)
- [ ] `calendar=connected` redirect; Connected UI; tokens in DB

### Sync API

- [ ] `GET /api/calendar/sync` with `x-user-token` → `{ connected: true/false }`
- [ ] `GET /api/calendar/sync?timeMin=…&timeMax=…` → `{ busy: [...] }` for connected user
- [ ] `DELETE /api/calendar/sync` → disconnect; Profile shows Not connected

### HGT-29 (when built)

- [ ] Plan respond flow fetches busy blocks and marks grid
- [ ] Anonymous responders unchanged (no Google required)

---

## Historical note

Nov 2025 audits (`docs/archive/audits/051126_*.md`) describe OAuth as missing — stale. See [archive/README.md](./archive/README.md).

**May 28, 2026:** A local stash on one machine had an alternate OAuth split (`lib/googleOAuth.ts` + `listGoogleEvents`); that was **not** merged. **`main` uses monolithic `lib/googleCalendar.ts`** (OAuth + `listBusyTimes` + `/api/calendar/sync`). Disconnect is implemented on Profile via `DELETE /api/calendar/sync`.
