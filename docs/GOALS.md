# Hangout — Internal Goals & Strategy

> Living document. Re-read every 2-4 weeks. Update freely.
> Last updated: [DATE]

---

## What this project is, honestly

Hangout is a hobby project that may grow into a serious side project. The founder is a Berkeley student building it because (a) he and his friends want to use it, (b) it's good engineering experience, (c) it's a meaningful resume artifact, and (d) there's a real chance it becomes something larger.

Monetization is not a near-term goal. Covering server costs is fine. Bleeding a little money is fine. This framing is important: it means we should optimize for *learning, building something we use, and creating an option for the future*, not for VC-style growth metrics.

If this becomes a real business, great. If it stays a polished tool used by a few hundred Berkeley students, that's also a real win.

## One-liner

A zero-friction group scheduling tool for college friend groups: drop a link in iMessage, everyone marks their availability in 30 seconds without signing up, plan happens.

## The problem

Group scheduling for college friends is dominated by two patterns, both broken:

1. **Group chat coordination** — vague time proposals, loud voices dominate, quieter people get steamrolled, plans die or run without people who would have come.
2. **When2Meet links** — works, but is ugly, mobile-hostile, and feels like an obligation. People groan when you send one.

The cost isn't just inconvenience. There's a real subset of would-be attendees who *wanted* to come but were friction-blocked: couldn't find the link again, didn't see the time picked, didn't want to download yet another app. We're not trying to convince introverts to socialize. We're trying to catch the stragglers.

**Quotes from real users:** *[TODO: collect 3-5 quotes from Berkeley friends about their last group scheduling experience.]*

## Why now

The strongest version of the timing argument: **the mode of social coordination shifted in the last ~8 years and the tools haven't caught up.**

Pre-2017ish, planning happened largely in person or by phone. When2Meet was a niche tool for the rare cross-distance coordination case. Today, even friends who see each other every day plan via text, because that's where the conversation lives. Coordination is now a primarily digital activity by default — but the dominant tool (When2Meet) was designed for the old mode.

Phones are also now the default device for our target users, and tolerance for clunky web tools is at a historical low. A mobile-first, taps-not-clicks scheduling tool didn't make sense in 2010. It does now.

## The user and the wedge

**First 100 users:** UC Berkeley friend groups (5-15 people). The founder is in this user group, has direct distribution access, and shares the use case.

**The wedge — and the actual differentiator vs. competition:** the *zero-account-required link flow*. Someone drops a Hangout link in iMessage. The link previews richly. Everyone taps it, marks their times, RSVPs with their name, all without leaving the app or making an account. Account creation is opt-in for people who want extras (multiple pods, history, calendar sync, activity polls).

This is the Partiful playbook: remove the "download an app and sign up" friction that kills viral spread in social products. Everything else (auto-schedule, ideas voting, pods) is retention payload, not the reason for first use.

**Critical:** v1 must nail the link-to-respond flow on mobile Safari. If a non-account user can't go from "tap link" to "marked my availability" in under 30 seconds with zero confusion, nothing else matters. *[TODO: usability test with 5 people who have never seen the app.]*

## How we'll build it

Already on Next.js + Supabase + Vercel + Claude Code. Stack is fine for the scale we'll realistically hit.

**Things to deliberately *not* build yet:**

- Native mobile app (PWA + good link previews are enough)
- Payments / subscriptions
- Anything requiring an Apple Developer account before there's evidence of demand
- iMessage extension (would be amazing, but is a real engineering project — defer until we've validated the core link flow)

**Riskiest technical assumption:** that the link-to-respond flow is genuinely friction-free for first-time users on mobile Safari, including rich link previews in iMessage. *[TODO: test this end-to-end before building anything else.]*

## Competitors and alternatives

**The honest market picture:** this space is more crowded than initial intuition suggests. There are no inactive corners; there are just no winners that have nailed our specific wedge.

### Direct competitors

**Howbout** — the most important competitor to study. ~6M downloads, 4.8/5 rating, Series A funded, already has availability overlay, polls, group chat per plan, calendar sync, and privacy controls. They've built much of what we'd build.

*Why we can still win against them:*

- They require app download + account + calendar sync to get value. We don't.
- They optimize for "ongoing shared social calendar" (heavyweight commitment). We optimize for "coordinate this one hangout right now" (lightweight, link-based).
- Independent reviews complain about their UX being cluttered and not ergonomic. UX is our #1 priority.
- 6M downloads sounds large but they appear to lack cultural penetration in our target demographic (Gen Z college students). The founder has never seen anyone his age use it. That's a real signal — they have scale but not stickiness with our user.

*Why we might lose against them:* they have a 5+ year head start, real funding, and could pivot toward our wedge faster than we can build a moat. Need to monitor.

**When2Meet** — the dominant incumbent for the specific use case we're targeting. Ugly, mobile-hostile, but has 20 years of brand recognition with college students. We win on UX, mobile, and feature depth. They win on inertia and on being a verb.

**Cal.com** — open source, well-funded, calendar integration solved. Aimed at professional B2B scheduling. Could ship a "casual" mode in a sprint if they wanted to, but probably won't because the market is too small for them. Real long-term threat if they ever pivot.

**Doodle** — older corporate group polling. Has calendar integration. Free tier degraded by ads. Loses on vibe and mobile experience.

**LettuceMeet, Rallly** — minor When2Meet alternatives. Limited reach.

### Adjacent (overlap, not direct)

**Partiful** — invitations, not availability-finding. Could plausibly add scheduling features. We share their playbook (low friction, link-based, social).

**Luma** — events with ticketing, professional and tech-meetup focused. Different use case.

### Indirect (the actually-strongest competitors)

- **iMessage / Discord / WhatsApp group chats** — the real default. Most plans get made (or die) here. We don't beat group chats by being "better at scheduling" — we beat them by being *invokable from the chat with one link* and faster than the conversation that would otherwise happen.
- **Doing nothing** — always the easiest option. The strongest competitor at this stage.

## Distribution

**Realistic plan for next 6 months:**

1. **Be the user.** Use Hangout for every hangout the founder personally tries to plan. Force it onto your own friend group. If it doesn't work for you, it won't work for anyone.
2. **One club, deep.** Pick one Berkeley club where you have a personal connection. Get them to use Hangout for every event for a semester. Learn obsessively. *[TODO: identify which club.]*
3. **Word-of-mouth from there.** Each event surfaces the link to 5-15 new people. The product is the marketing surface.

**What we are *not* doing:** mass-emailing every UC club. Low-conversion, high-effort, low-learning. One deeply engaged group teaches us more than 50 lukewarm trials.

**Stretch / future:** iMessage extension. This is the real distribution multiplier if it works (Partiful proved it). Defer until v1 link flow is validated.

## Business model

Free indefinitely for end users. If it grows, monetization candidates:

- Cosmetic customization subscription (Discord-style)
- Soft limits on free tier (number of pods, history retention, advanced features)
- Sponsored event placement, *if* a discovery surface ever exists

Average user must never pay. Non-negotiable for a viral social product.

**Honest take:** monetization is not a near-term concern. The current goal is "doesn't bleed money badly" and "is something we'd put on a resume." That's enough.

## Milestones

Outcome-based, not date-based. Each is a hypothesis to validate.

- **M1 (Validation):** One non-founder friend group uses Hangout to plan 3 hangouts in a month, unprompted after the first one.
- **M2 (Group fit):** One Berkeley club uses Hangout for every event for a full month.
- **M3 (Retention):** 50%+ of pods that hold one event hold a second within 30 days.
- **M4 (Reach):** 200 Berkeley students have used Hangout at least once. 50 of them have used it more than once.
- **M5 (Stretch):** Spreads to a second campus organically, with no founder outreach.

## What would make us kill this (or pivot)

The strongest signal will come from us, not the market.

- **Founder attention failure:** if after starting a full-time job, the founder hasn't shipped a meaningful change to Hangout in 6 weeks, the project is dead in practice. Acknowledge it and move on rather than pretending.
- **Retention failure:** if after 3 months of M2-style focus, fewer than 30% of pods that hold one event hold a second. (Acquisition can be hacked; retention can't.)
- **Howbout pivots:** if Howbout (or another well-funded competitor) ships a no-account, link-first flow that nails our wedge, our differentiation evaporates and we'd need a new angle.

**What is *not* a kill criterion:** slow growth in the first 3 months, ugly initial numbers, low DAU. Those are baseline.

## Open questions and assumptions

Ranked by "how hosed are we if this is wrong":

1. **(Critical)** That a polished, link-first, no-account scheduling tool actually gets people to switch from When2Meet and group chats. Habits are sticky. *[Test: get 5 friends who currently use When2Meet to try Hangout for one real event; see if they pick Hangout next time, unprompted.]*
2. **(Critical)** That "social/casual group scheduling for college students" is a real, distinct market — not just a use case that gets absorbed by bigger tools (Howbout, Partiful, Cal.com) once they pay attention to it. We may be betting that the incumbents *won't* pivot toward us in time. That's a real bet.
3. **(Critical)** That distribution from "one club" actually spreads. If clubs are a dead-end channel, we need a different wedge.
4. **(Important)** That the link-to-respond flow is genuinely friction-free for non-account holders on mobile Safari, including rich link previews in iMessage.
5. **(Important)** That the "ideas voting + auto-schedule" features are actually used and create retention, vs. people using us as a When2Meet replacement and ignoring the extras.
6. **(Less critical)** Monetization — can defer for a year and lose nothing.

## Founder notes

- **Commitment level:** Casual hobby for the next month (until graduation). Potentially upgrades to a serious side project after that, depending on job situation. Re-evaluate the doc and milestones if commitment level changes.
- **Biggest personal risk:** this becomes a "code-the-fun-parts" project that never gets in front of users. Counter-rule: every week, at least one conversation with a real or potential user about their actual scheduling experience. No exceptions.
- **What "winning" looks like personally:** not necessarily a company. A polished thing that a few hundred Berkeley students use weekly is a real, meaningful accomplishment, regardless of whether it ever makes a dollar. Resume value, engineering experience, and a tool the founder actually uses are sufficient outcomes.

## Things to do this week

*[Use this section as a rolling action list. Delete and replace each week.]*

- [ ] Download Howbout, use it for one real plan, take notes on what's clunky and what's not
- [ ] Collect 3-5 user quotes about their last group scheduling pain
- [ ] Identify which Berkeley club is the candidate for "one club, deep"
- [ ] End-to-end test the link-to-respond flow on iMessage on a friend's phone
