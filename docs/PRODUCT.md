# Hangout — Product Blueprint (v1)

> Companion document to GOALS.md. This is *what we're building right now*, not what Hangout will be forever. Re-evaluate after each milestone in GOALS.md.
> Last updated: June 2026 (auth strategy §9 aligned with research review)

---

## Product thesis in one paragraph

Hangout is a link-first group scheduling tool. The atomic unit is a *plan*: a single shareable URL that lets anyone — with or without an account — mark availability, suggest activities, vote, and RSVP, all from mobile Safari in under 30 seconds. Accounts exist but are optional and only unlock features that genuinely require persistence (pods, history, calendar sync). The product wins by being the fastest, most painless way to coordinate one specific hangout, not by being a place where you live.

## Design principles (use these to decide every feature)

1. **The link is the product.** A first-time user must be able to respond to a Hangout plan from mobile Safari without creating an account, downloading anything, or completing more than one screen of input. If a feature degrades this, the feature doesn't ship.
2. **Anonymous is a first-class citizen.** Plans must be fully usable by people who only ever enter their first name. Account holders get extras, but nothing core requires login.
3. **No surveillance vibes.** Phone and email are never required to respond to a plan link — only a first name. Optional account sign-in may use phone or email, but that is separate from the anonymous respond flow. No mandatory contact upload. No "invite 3 friends to unlock the app." No social feed showing what your friends are up to. No engagement-bait notifications.
4. **Plans are ephemeral by default.** A plan disappears 30 days after its scheduled date unless an account holder pins it. We are not a calendar; we are a coordination tool.
5. **Mobile-first, then desktop.** Every screen gets designed for a 5.5" iPhone before it gets designed for anything else. Desktop is responsive scaling, not a separate experience.
6. **Boring tech, sharp UX.** No novel architectures. No experimental features. The differentiation is in the polish of the basic flows.
7. **Fast is a feature.** Hangout should feel like the lightweight option — instant plan links, no bloat. The plan landing page loads in <1s on 4G; marking availability completes in <30s. Latency on `/p/[slug]` is not deferrable tech debt. See [PERFORMANCE.md](./PERFORMANCE.md) for workflow and agent rules.
8. **Collect little, protect what you must.** Responders share only a first name on the sacred path. Account email and Google tokens are high-sensitivity — protect via access control, hashing, and encryption where appropriate; do not blanket-encrypt plan content that participants must see. See [PRIVACY.md](./PRIVACY.md).

---

## The two surfaces

### Surface 1: The Plan (no account required)

A Plan is the core unit. When someone creates a plan, they get a URL like `hangout.app/p/dinner-saturday-x7k`. Anyone with the URL can participate.

**Lifecycle of a plan:**

1. **Create** — A user (account or not) names the plan, sets a date range to poll over (e.g. "this Saturday" or "any day next week"), and gets a shareable URL.
2. **Share** — User drops the URL in iMessage, Discord, group chat, etc. Rich link preview shows: plan name, who created it, current participant count, "tap to join."
3. **Respond** — Recipients tap the link, land in mobile Safari (or open the PWA if installed), enter just their first name, and mark availability. This screen must be designed to be completable in under 30 seconds.
4. **Build** — Anyone in the plan can add activity ideas. Anyone can upvote. Optional: location, duration, indoor/outdoor.
5. **Lock** — The plan creator (or anyone, in unmanaged mode) clicks "auto-schedule." System picks the best (time, activity) combination based on availability, votes, and weather.
6. **RSVP** — Everyone gets one final ping with the locked time and activity. Yes/Maybe/No.
7. **Expire** — 30 days after the event date, the plan archives itself. Account holders who pin it can keep it forever.

**Critical:** anonymous responders are identified only by the first name they enter, scoped to that one plan. Their data isn't tracked across plans. They aren't asked to "create an account to save your response." If they want to come back to the plan, the URL is enough; we set a cookie to remember them on that device.

### Surface 2: The Pod (account required)

A Pod is a recurring group that wants to plan together repeatedly — a friend group, a club, a family. Pods are the retention payload. Most users will never need one. That's fine.

**What a pod adds over plans:**

- Persistent membership (you don't re-add your 8 friends every time)
- Shared activity idea bank (recurring suggestions don't get re-typed)
- Plan history (see what we did last month)
- Optional one-way calendar sync (read-only: we look at your Google Calendar busy times to pre-fill your availability; we never write events to it unless you click "export this plan to my calendar")
- Pod-level analytics (rough heat map of when this group tends to be free)

A pod can create a plan that uses pod-member availability automatically, but the plan itself still works the same way and can be shared with non-pod-members via link.

---

## Core features (v1 — must ship)

### 1. The Plan creation flow
- One screen. Plan name, date range, optional default duration.
- Output: a URL with a memorable slug + a randomized suffix for uniqueness.
- Optional: password-protect the plan (for sensitive groups).

### 2. The Plan landing page (the make-or-break surface)
- Loads in <1 second on a 4G connection.
- Above the fold: plan name, who's coming, big "Mark your availability" button.
- One-tap entry: just type a first name, then drag-select availability on a weekly grid.
- Mobile grid is finger-friendly. No pinch-zoom needed. Generous tap targets.
- Save-as-you-go. No "submit" button at the end of marking availability — changes persist on each tap.

### 3. Availability heatmap
- Color-graded grid showing overlap density.
- Tap any cell: see who's free, who's not, who hasn't responded yet.
- Toggle: "show only times where everyone is free" / "show times where 80%+ are free."

### 4. Activity ideas board
- Anyone in the plan can add an idea (text + optional location + optional indoor/outdoor + optional duration).
- One-tap upvote, one tap to remove your vote. No downvotes (avoids social friction).
- Sort by votes, default-collapsed once an idea has 3+.

### 5. Auto-schedule
- Single button on the plan page.
- Algorithm considers 30-minute slots from 9am–9pm on each date in the poll. An idea must have 2+ upvotes; a slot counts only if every upvoter marked themselves available and the start time is still in the future.
- Ranking among valid (slot, idea) pairs: (1) most total people available at that slot, (2) more upvotes on the idea, (3) better weather for outdoor ideas with a location — hourly forecast geocoded from the idea's location; rain and storms lower the rank; indoor ideas, ideas without a location, or missing forecast data score neutral, (4) earliest slot.
- If the winning idea has a duration, the scheduled end time is set from the start slot.
- Result: the plan transitions from "polling" to "scheduled." Everyone gets a notification (push if they have the PWA installed, otherwise nothing — no email spam).

### 6. RSVP
- Once scheduled: yes / maybe / no. That's it.
- Visible to everyone in the plan.
- Editable until the event happens.

### 7. Rich link previews
- Open Graph tags configured per-plan so iMessage, Discord, WhatsApp, Slack all show: plan name, creator first name, participant count, locked time if scheduled.
- This is a 1-day engineering task that pays for itself a hundred times.

### 8. PWA installation
- Add-to-home-screen prompt (gentle, not a wall) after a user has interacted with 2+ plans.
- Once installed, push notifications become available. Notifications are ONLY for: someone responded to a plan you created, your plan got auto-scheduled, an event you RSVP'd yes to is happening tomorrow. No social feed, no "your friend updated their availability" noise.

### 9. Account sign-in (optional, passwordless, lazy)
- Triggered at **success moments** (create a pod, persist plans past 30 days, calendar sync, cross-device return) — not up front on the sacred path. See **HGT-149** (lazy prompts).
- **Shipped today:** **email magic link only** at `/auth/signin` (HGT-13) — one email field, account auto-created on first link; display name from plan cookie or email (`lib/displayName.ts`). `/auth/signup` redirects to sign-in. `/auth/signin/options` is a stub (no password yet).
- **Near-term (HGT-91 / HGT-148):** Polish magic link — copy, error states, deliverability, mobile Autofill. Keep `/auth/signin` to **one** primary method; avoid a crowded “wall of logos” (research + UX literature, Jun 2026 review).
- **Step-up auth (when built — HGT-93, deprioritized):** SMS OTP only for **account recovery** and **high-risk actions** (e.g. delete all pods, disconnect Google Calendar) — **not** co-primary login on `/auth/signin`.
- **Medium-term (HGT-95, deprioritized):** Passkeys / WebAuthn for power planners who want cross-device continuity.
- **Likely out of v1 (Linear: Deprioritized / Might be removed):** Password (HGT-94), email+phone tabs UI (HGT-92), Google/Apple **identity** SSO (HGT-96/97). Google **Calendar** OAuth (HGT-29/34) stays — separate from “who you are.”
- No contact upload, no friend invitation requirement. Plan respond flow never requires phone, email, or any account.
- Existing anonymous responses in plans automatically migrate to the new account if claimed via cookie.
- Linear: parent **[HGT-91](https://linear.app/hangout-friends/issue/HGT-91)**; active children **HGT-148**, **HGT-149**; legacy multi-method tickets **HGT-92–97** tagged, not deleted.

### 10. Pods (basic version)
- Create a pod, name it, invite members by sharing a pod link.
- New plans created within the pod auto-include all pod members' availability if they've shared it.
- Pod-level activity idea bank that pre-populates new plans.

### 11. Read-only Google Calendar sync (account holders only)
- Optional. One-way. We read your busy times only.
- Used to pre-fill your "unavailable" slots when you respond to a plan.
- We never write events back unless you click "export this plan to my calendar," which generates a one-shot ICS file or calendar event.
- Apple Calendar and Outlook can wait until v2.

### 12. Admin / moderation
- Plan creator can remove a participant or an idea.
- Pod owner can remove members.
- Site admin (you) can take down a plan via existing admin panel.
- That's it. No karma, no flags, no community moderation. Too small to need it.

---

## Explicitly NOT in v1 (and why)

| Feature | Why not |
|---|---|
| Group chat per plan | Plans live in iMessage/Discord. Don't recreate the group chat in our app. Howbout's chat is one of their most-complained-about features. |
| Social feed of friends' plans | This is the "surveillance vibes" trap. Howbout did this; it's their Achilles heel with privacy-conscious Gen Z. |
| Photo / video sharing | Not our job. Photos belong in iMessage. |
| "Wrapped" / year-end summaries | Cringe, intrusive, can't-be-disabled energy. Hard pass. |
| Activity feed showing what friends are up to | See: surveillance vibes. |
| Native iOS / Android apps | PWA covers 95% of the value. Native is a distraction until proven otherwise. |
| iMessage extension | Real engineering project, real Apple Developer Program friction. Defer until link flow is validated. Will be huge if it works. |
| Bucket lists, travel planning, life-goal tracking | Scope creep. We coordinate one plan at a time. |
| AI scheduling assistant ("just CC the bot") | Cool, hard, expensive, premature. Wait until you have a stable user base. |
| Payment / subscription tier | Not until we know what someone would pay for. |
| Two-way calendar write-back | Privacy risk. People don't want random apps adding events to their calendars. ICS export on demand is enough. |
| Apple / Outlook calendar integration | Google covers most of our demographic. Add others when users actually ask. |
| Password sign-in | Friction + security debt vs magic link; [HGT-94](https://linear.app/hangout-friends/issue/HGT-94) tagged *Might be removed*. |
| Google / Apple **identity** SSO | Optional at best; [HGT-96](https://linear.app/hangout-friends/issue/HGT-96)/[HGT-97](https://linear.app/hangout-friends/issue/HGT-97) tagged *Might be removed*. Calendar OAuth (Google busy read) is separate and in scope. |
| SMS OTP as **routine** login | Weak as primary channel; if shipped, step-up/recovery only ([HGT-93](https://linear.app/hangout-friends/issue/HGT-93)). |
| Reminders, alarms, notifications beyond the three core types | Notification overload is a documented problem in this category. We send 3 kinds of notifications, ever. |
| Public / discoverable plans | Spam vector, moderation nightmare, not our use case. |
| Friend connections, follower system | We're not a social network. |
| Internationalization | English first. Hard data on whether Berkeley needs anything else. |

---

## Tech architecture (brief, since you already have most of this)

- **Frontend:** Next.js 16 + Tailwind v4. Already in place.
- **Backend:** Next.js API routes. Already in place.
- **Database:** Supabase Postgres with RLS. Already in place.
- **Auth:** Custom token system (`gs_token` cookie) for accounts. Anonymous plan identity via per-plan httpOnly cookie. Account sign-in: **email magic link** (v1); step-up SMS and passkeys later per [HGT-91](https://linear.app/hangout-friends/issue/HGT-91). Google Calendar OAuth is separate from identity login. Migrate to Supabase Auth only if custom auth becomes unmaintainable.
- **Hosting:** Vercel. Already in place.
- **PWA:** Next.js PWA plugin, Workbox for service worker, manifest.json with proper iOS icons.
- **Push notifications:** Web Push API. iOS Safari supports it as of 16.4. Test thoroughly on actual iPhones.
- **Link previews:** Per-plan dynamic OG tags rendered server-side. Critical: test in iMessage, Discord, WhatsApp, Slack, Twitter, Telegram before launch.
- **Calendar sync:** Google Calendar API, read-only scope. Busy times cached per-user for 1 hour. Google push notifications (Watch API) invalidate the cache when the user's calendar changes; channels are renewed daily via cron before their 7-day expiry.
- **AI:** Already wired up Claude for bug-report fix suggestions in admin. Don't expand AI's role in the product itself in v1.

---

## What to build, in order

This is a suggested sequence. Each step should be considered "done" only when it's been used by at least one real person other than you.

1. **Audit and fix the existing link-respond flow.** This is your most important task. Take a teardown approach: have 5 friends who've never seen the app try to respond to a plan link on their phones. Fix every friction point. Repeat until it's effortless.
2. **Rich link previews.** OG tags rendered per plan. Test in iMessage, WhatsApp, Discord, Slack.
3. **Mobile-first availability grid.** Polish the existing grid into something that feels great on a phone. Big tap targets. Drag-select. Save on every interaction.
4. **PWA polish.** Manifest, icons, install prompt. Test add-to-home-screen on iOS and Android.
5. **The three-notification system.** Push notifications only for the three events listed above. Build it once, build it right.
6. **Account sign-in polish.** Magic link only on `/auth/signin`; lazy account prompts (HGT-149). See HGT-91 / HGT-148.
7. **Pod creation flow.** For users who want to plan repeatedly with the same group.
8. **Read-only Google Calendar sync.** Pre-fills availability. One-way only.
9. **ICS export.** "Add this scheduled plan to my calendar" — one-shot, no integration required.
10. **Admin polish.** Use the existing admin panel; clean up anything that's broken.
11. **Stop and re-evaluate.** After all of the above is real and used, return to GOALS.md and decide what's next.

---

## What "v1 done" means

You can call v1 done when all of these are true:

- A friend who's never seen the app can respond to a plan link in <30 seconds, no account, no confusion.
- Rich link previews look great in iMessage and at least 2 other chat platforms.
- The PWA installs cleanly on iOS and Android and supports push notifications.
- One non-founder friend group has used Hangout to plan at least 3 hangouts unprompted.
- One Berkeley club is committed to using it for the semester.
- Calendar sync works for Google for account holders.
- Account sign-in is **email magic link** with polished UX (HGT-148); Autofill-friendly inputs; no requirement for password, phone login, or SSO on `/auth/signin`.
- Auto-schedule produces sensible results in 90%+ of cases on real plans.

You do not need: a polished pod system, multiple calendar integrations, native apps, monetization, or 1000 users. Those are v2 problems.

---

## How this blueprint should evolve

This document is wrong about something. We just don't know what yet. The way you find out is by using the product, watching real users use it, and updating this doc when reality contradicts it. Specifically:

- If users keep asking for a feature that's in the "NOT in v1" list, reconsider it (don't reflexively add it).
- If a feature in the "core v1" list goes unused for 4+ weeks of real usage, consider cutting it.
- If you find yourself building something that contradicts the design principles, stop and either change the principles or kill the feature.

Re-read this doc before starting any new feature work. If the feature isn't justified by something in this doc, either justify it explicitly here or don't build it.
