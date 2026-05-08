# Hangout — Internal Goals & Strategy

> Living document. Re-read every 2-4 weeks. Update freely.
> Last updated: [DATE]

---

## One-liner

We're building a better When2Meet for college friend groups — fast, mobile-first, with group decision-making baked in — so the people who *wanted* to come stop getting friction-blocked into staying home.

## The problem

Group scheduling among college students is dominated by When2Meet, which is ugly, mobile-hostile, and feature-thin. The actual experience of planning a hangout looks like:

- Someone proposes a vague time in a group chat
- A few loud voices dominate, quieter people get steamrolled or skipped
- Half the group never responds, the plan dies, or it goes ahead without people who *would have come*
- The "schedule" gets re-litigated three more times before the event

The loss isn't that people don't want to socialize. They do. But the friction between *wanting to go* and *successfully ending up at a thing* is high enough that a meaningful chunk of would-be attendees self-select out. We're not trying to convince introverts to go to parties. We're trying to catch the stragglers — people who would have come if scheduling hadn't been a mess.

**Quotes from real users:** *[TODO: collect 3-5 quotes from Berkeley friends about their last group scheduling experience. This is your first task.]*

## The insight

When2Meet has dominated this category for ~20 years with no real challenger, despite being objectively bad. Two interpretations:

1. There's no money here, so nobody's bothered. (Probably partially true.)
2. The market has been sleepy and is ripe for someone to wake up.

Both can be true. Partiful is the proof that (2) is real: they took social event coordination, removed friction (no app download, lives in iMessage), and grew fast. The playbook works in this category.

What's changed: phones are now the default computing device for our target users, and tolerance for clunky web tools is at an all-time low. A mobile-first, taps-not-clicks scheduling tool didn't make as much sense in 2010. It does now.

## The user and the wedge

**First 100 users:** UC Berkeley students, specifically friend groups and small clubs (5-15 people). The founder is at Berkeley, has direct distribution access, and shares a use case with the user.

**The wedge:** A scheduling experience that feels lighter than When2Meet on every dimension — faster to mark availability, cleaner heatmap, works perfectly on mobile, no account required to respond to a link. Everything else (ideas/voting, RSVPs, auto-schedule, pods) is a bonus that sets up retention but isn't the reason someone tries it the first time.

**Critical:** The "viral atom" needs to be a single shareable link that a non-user can open on their phone and respond to in under 30 seconds, no signup. This is how Partiful won. *[TODO: confirm current product supports this cleanly — if not, prioritize.]*

## How we'll build it

Already built on Next.js + Supabase + Vercel. Heavy use of Claude Code for implementation. Stack is fine for the scale we'll realistically hit in the next 6 months.

**Things to deliberately *not* build yet:**
- Native mobile app (PWA is enough for now; native is a distraction)
- Payments / subscription infrastructure
- Anything requiring an Apple Developer account before there's evidence of demand
- iMessage extension (would be amazing, but it's a real engineering project — defer until traction is proven)

**Riskiest technical assumption:** That the link-to-respond flow is genuinely fast and friction-free on mobile, including for first-time users on iOS Safari. *[TODO: usability test with 5 people who have never seen the app.]*

## Competitors and alternatives

**Direct:**
- **When2Meet** — the incumbent, ugly but free and well-known. Wins on brand recognition. We win on UX, mobile, and feature depth.
- **Doodle** — more polished, but feels corporate; aimed at meetings, not hangouts. Free tier is nagware-y.
- **Rallly** (open source) — closest competitor in vibe, but barely marketed.
- **Partiful** — adjacent, not direct. They do invitations, not availability-finding. We could end up overlapping with them or being complementary.

**Indirect (these are what we actually have to beat):**
- **Group chats (iMessage, Discord)** — the real default. Most plans get made, and die, here.
- **"Just doing nothing"** — the actual strongest competitor. Easier than coordinating.
- **Google Calendar invites** — for the more organized.

We don't beat group chats by being "better at scheduling." We beat them by being *invokable from a group chat with one shared link* and being so low-friction that using us is faster than the chat conversation that would otherwise happen.

## Distribution

**Realistic plan for next 6 months:**

1. **Be the user.** Use Hangout for every hangout the founder personally tries to plan. Force it onto your own friend group. If it doesn't work for you, it won't work for anyone.
2. **One club, deep.** Pick one Berkeley club where you have a personal connection. Get them to use Hangout for every event for a semester. Learn obsessively from their pain. *[TODO: identify which club.]*
3. **Word of mouth from there.** Each event using Hangout exposes 5-15 new people to the link. The product itself is the marketing surface.

**What we are *not* doing:** mass-emailing every UC club. That's a low-conversion, high-effort, low-learning activity. One deeply engaged group teaches us more than 50 lukewarm trials.

## Business model

Free for the foreseeable future. Realistic monetization paths if it grows:

- Cosmetic/customization subscription (Discord-style)
- Limits on free tier (number of pods, history retention) with a cheap unlock
- Sponsored event placement, if there's ever a discovery surface (probably never)

Average user should never pay. This is non-negotiable for a viral social product. If we monetize, it's via whales and corporates, not by adding friction to the core loop.

**Honest take:** monetization isn't a near-term concern. Worry about it after we have evidence of retention.

## Milestones

Outcome-based, not date-based. Each is a hypothesis to validate.

- **M1 (Validation):** One non-founder friend group uses Hangout to plan 3 hangouts in a month, unprompted after the first one.
- **M2 (Group fit):** One Berkeley club uses Hangout for every event for one full month.
- **M3 (Retention):** 50%+ of pods that hold one event hold a second within 30 days.
- **M4 (Reach):** 200 Berkeley students have used Hangout at least once. 50 of them have used it more than once.
- **M5 (Stretch):** Spreads to a second campus organically, with no founder outreach.

## What would make us kill this (or pivot)

The strongest signal will come from us, not the market. Honest kill criteria:

- **Founder attention failure:** If after starting a full-time job, founder hasn't shipped a meaningful change to Hangout in 6 weeks, the project is dead in practice. Acknowledge it and stop pretending.
- **Retention failure:** If after 3 months of M2-style focus, fewer than 30% of pods that hold one event hold a second. (Acquisition can be hacked; retention can't.)
- **Indistinguishable competitor appears:** A well-funded team ships a polished, mobile-first When2Meet replacement and gets distribution before us. Realistic but not imminent.

**What is *not* a kill criterion:** slow growth in the first 3 months, low DAU, ugly initial numbers. Those are baseline, not signals.

## Open questions and assumptions

Ranked roughly by "how hosed are we if this is wrong":

1. **(Critical)** That a polished, mobile-first scheduling tool actually gets people to switch from When2Meet, vs. them just using whatever they used last time. Habits are sticky. *[Test: get 5 people who currently use When2Meet to try Hangout for one real event; see if they choose Hangout the next time unprompted.]*
2. **(Critical)** That distribution from "one club" actually spreads. If clubs are a dead-end channel, we need a different wedge.
3. **(Important)** That the link-to-respond flow is genuinely friction-free for non-account holders on mobile.
4. **(Important)** That the "ideas voting + auto-schedule" feature actually gets used, vs. people just using it as a When2Meet replacement and ignoring the extras.
5. **(Less critical)** Monetization. We can defer this for a year and lose nothing.

## Founder notes

- **Commitment level:** Casual hobby for the next month (until graduation), potentially upgrading to serious side project after that depending on job situation. The doc and milestones should be re-evaluated if commitment level changes.
- **Biggest personal risk:** This becomes a "code-the-fun-parts" project that never gets in front of users. The fix is to set a hard rule: every week, at least one conversation with a real or potential user. No exceptions.
- **What "winning" looks like personally:** Not necessarily a company. A polished thing that a few hundred Berkeley students use weekly is a real, meaningful accomplishment, regardless of whether it ever makes a dollar.
