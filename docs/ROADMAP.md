# Hangout — Roadmap

Personal planning doc. Not a commitment, just a living reference.

---

## Near-term (next few sessions)

### Data protection (HGT-150 — backlog)

Encrypt Google refresh tokens; hash session + magic-link tokens; purge expired auth rows; optional hard-delete after plan archive. **Not** encrypting plan titles or respondent first names (visible to link holders by design). See [PRIVACY.md](./PRIVACY.md). File/sync: `node scripts/linear-privacy-data-jun2026.mjs`.

### Account sign-in (HGT-91 — v1)
**Magic link first** — polish HGT-148; lazy prompts HGT-149. SMS (HGT-93) only as step-up/recovery if built. Passkeys (HGT-95) medium-term. HGT-92–94, HGT-96–97 tagged *Deprioritized* / *Might be removed* in Linear. Product: [PRODUCT.md](./PRODUCT.md) §9. Sync: `node scripts/linear-auth-strategy-jun2026.mjs`.

### Mobile UX
The app works on mobile but has rough edges. Priority improvements:
- **Bottom navigation bar** — current top nav is cramped on small screens; a fixed bottom tab bar is the standard mobile pattern
- **PWA support** — add `manifest.json` so the app is installable from Safari/Chrome to the home screen (full-screen, no browser chrome)
- **Swipe gestures** — swipe between tabs, swipe to dismiss modals
- **Availability grid on mobile** — the grid is functional but drag-selecting is fiddly; consider a tap-to-toggle mode alongside drag
- **Input sizing audit** — make sure all tap targets are ≥44px, no accidental zoom on focus

### Ideas — validation
- **Suggested time requires end time** — if a start time is set on an idea, an end time must also be provided; block submission otherwise. Both fields remain optional if neither is set.

### Auto-scheduler improvements
Current behavior is very naive (picks the single slot with most voter overlap). Better would be:
- **Multiple suggestions** — show top 3 candidate slots and let the user pick
- **Respect duration** — currently ignores idea duration when finding a slot; should find a contiguous block long enough for the activity
- **Avoid back-to-back events** — don't schedule on a day that already has an event
- **Time-of-day preferences** — let users mark morning/afternoon/evening preference in addition to raw availability
- **Scoring display** — show *why* a slot was chosen ("4/5 voters free, Saturday afternoon")

### Google Maps integration
- **Location autocomplete** — replace the free-text location field with a Places Autocomplete input so locations are clean and geocoded
- **Map preview on idea cards** — small static map thumbnail for ideas with a location
- **Travel time on event cards** — currently only shown on ideas; copy it through to the created event
- **Configurable base location** — Berkeley is hardcoded; make it a setting per-group (or per-user)
- **Distance filter** — ability to filter ideas by max travel time

### Weather forecast integration
- **Outdoor idea auto-scheduling** — when auto-scheduling an outdoor idea, check the forecast for candidate dates and prefer days with good weather
- **Weather badge on events** — show forecast (temp + condition icon) on upcoming event cards
- **Weather warning** — flag if an outdoor event is scheduled on a day with rain/snow in the forecast
- Likely API: Open-Meteo (free, no key needed) or OpenWeatherMap

### Google Calendar (account holders)

**Done (May 2026):** OAuth connect on Profile (`/api/google/auth`, `/api/google/callback`); tokens in `users.google_*`; localhost verified. Details: [GOOGLE_CALENDAR.md](./GOOGLE_CALENDAR.md).

**Next (HGT-29):** Import busy blocks to pre-fill availability on plans — wire `listBusyTimes` from `lib/googleCalendar.ts` via `GET /api/calendar/sync?timeMin&timeMax` into the plan respond grid.

**Deferred QA:** Production connect, token refresh, calendar read smoke test — checklist in GOOGLE_CALENDAR.md.

**Not planned here:** `/calendar` destination page (PRODUCT: sync is a background utility, not a calendar app).

---

## Medium-term

### Notifications
- **Event reminders** — email or push notification N hours before an event
- **New event ping** — notify group members when a new event is created
- **RSVP nudge** — remind people who haven't RSVP'd yet
- Push notifications via Web Push API (works on Android; limited on iOS until iOS 16.4+)

### Calendar integration
- **Export to calendar** — `.ics` file download or "Add to Google Calendar" link on each plan/event (PRODUCT build step 8; after pre-fill)
- **Import availability from Google Calendar** — parse busy blocks and pre-fill the availability grid (**OAuth done**; UI/API integration remaining — HGT-29)

### Event improvements
- **Recurring events** — weekly/monthly game nights, etc.
- **Event comments/thread** — basic discussion on each event card
- **Photo/link attachments** — attach a restaurant menu, address, etc.
- **Waitlist** — if an event has a capacity limit, overflow goes to a waitlist

---

## Long-term / Ambitious

### Pods (multi-group support)
Currently the app is a single shared space — everyone is in one group. The big architectural jump is supporting multiple friend groups ("pods") with separate availability, ideas, and events per pod.

Rough concept:
- A **pod** is like a Discord server — has its own members, availability grid, ideas board, and events
- Users can belong to multiple pods
- Pods can be **public** (joinable by link) or **private** (invite only)
- Pod admin manages approved names and settings for their pod
- Auto-scheduler and ideas are scoped to the pod

**What this requires:**
- New `pods` table with slug, name, is_public, admin_id
- New `pod_members` join table
- Foreign key `pod_id` on availability, ideas, idea_votes, events, rsvps, bug_reports
- Per-pod admin panel
- Pod creation/join/invite flow
- URL structure: `/pods/[slug]/ideas`, `/pods/[slug]/events`, etc.
- Auth rework — current single-group token system needs pod-scoped identity

This is a significant rewrite of the data model. Worth doing if the app expands beyond one group.

### AI improvements
- **Claude auto-fix pipeline** — bug report → Claude suggestion → one-click apply the patch (requires more Claude Code integration)
- **Smart idea suggestions** — Claude suggests activity ideas based on past events, season, and group preferences
- **Natural language scheduling** — "Schedule a dinner sometime next week when most people are free" → auto-creates the event
- **Sentiment on RSVPs** — let people leave a short note with their RSVP ("can't make it, work trip")

---

## Known rough edges (fix when encountered)

- Travel time is only calculated on idea creation — editing location doesn't recalculate
- Voter names on idea cards truncate awkwardly at narrow widths
- No loading state on the RSVP buttons (optimistic update would help)
- Admin panel has no pagination — will get slow with many members/events
- `ANTHROPIC_API_KEY` not yet configured — Claude fix button returns an error
- No empty state on the Events tab for new users who haven't joined yet
