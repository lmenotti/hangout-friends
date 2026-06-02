/**
 * File iOS PWA tester feedback (Jun 1, 2026) into Linear — create missing issues,
 * comment on existing ones (no duplicates).
 *
 * Run: node scripts/linear-ios-pwa-feedback-jun2026.mjs
 * Requires LINEAR_API_KEY in .env.secrets.local or ~/.cursor/mcp.json (linear-hangout).
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

function apiKeyFromMcpConfig() {
  const mcpPath = resolve(process.env.HOME ?? '', '.cursor/mcp.json')
  if (!existsSync(mcpPath)) return undefined
  try {
    const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
    const servers = mcp.mcpServers ?? {}
    for (const name of ['linear-hangout', 'linear', 'plugin-linear-linear', 'user-linear-hangout']) {
      const key = servers[name]?.env?.LINEAR_API_KEY
      if (key) return key.trim()
    }
  } catch {
    return undefined
  }
  return undefined
}

const API_KEY = envValue('LINEAR_API_KEY') ?? apiKeyFromMcpConfig()
if (!API_KEY) {
  console.error(
    'Set LINEAR_API_KEY in .env.local (via loadEnvLocal), .env.secrets.local, or ~/.cursor/mcp.json',
  )
  process.exit(1)
}

const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'
const MVP_PROJECT_ID = '0a48dfaa-e28a-4595-9b54-abef90cb0ccc'
const TODO = 'fdb7b465-aef1-43b9-bbf7-40c657ebcabd'
const BACKLOG = '042e2f5a-217d-46de-90b4-a16bdc453b70'

const TEST_CONTEXT = `**Source:** iOS PWA testing (Jun 1, 2026). Unless noted otherwise, repro on installed PWA (Add to Home Screen), not Safari tab.`

async function gql(query, variables = {}) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2))
  return json.data
}

async function findByIdentifier(identifier) {
  const num = parseInt(identifier.replace(/^HGT-/i, ''), 10)
  const data = await gql(
    `query($teamId: String!, $num: Float!) {
      team(id: $teamId) {
        issues(filter: { number: { eq: $num } }) {
          nodes { id identifier title url }
        }
      }
    }`,
    { teamId: TEAM_ID, num },
  )
  return data.team.issues.nodes[0] ?? null
}

async function searchIssues(term) {
  const data = await gql(
    `query($term: String!) {
      searchIssues(term: $term, first: 15) {
        nodes { id identifier title url project { name } }
      }
    }`,
    { term },
  )
  return data.searchIssues.nodes
}

async function findProjectByName(name) {
  const data = await gql(
    `query($filter: ProjectFilter!) {
      projects(filter: $filter, first: 5) {
        nodes { id name }
      }
    }`,
    { filter: { name: { containsIgnoreCase: name } } },
  )
  return data.projects.nodes.find(p => p.name.toLowerCase().includes(name.toLowerCase())) ?? null
}

async function addComment(issueId, body) {
  await gql(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
    { input: { issueId, body } },
  )
}

async function createIssue(input) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }`,
    { input: { teamId: TEAM_ID, ...input } },
  )
  return data.issueCreate.issue
}

async function commentOnIdentifier(identifier, body) {
  const issue = await findByIdentifier(identifier)
  if (!issue) {
    console.warn(`  skip comment — ${identifier} not found`)
    return null
  }
  await addComment(issue.id, body)
  console.log(`  commented ${issue.identifier}: ${issue.title}`)
  return issue
}

async function createIfNotDuplicate(titleSubstring, input) {
  const hits = await searchIssues(titleSubstring)
  const lower = titleSubstring.toLowerCase()
  const existing = hits.find(i => i.title.toLowerCase().includes(lower))
  if (existing) {
    console.log(`  exists ${existing.identifier}: ${existing.title}`)
    return { action: 'exists', issue: existing }
  }
  const issue = await createIssue(input)
  console.log(`  created ${issue.identifier}: ${issue.url}`)
  return { action: 'created', issue }
}

async function main() {
  const perfProject = await findProjectByName('Performance')
  const perfProjectId = perfProject?.id

  console.log('\n=== Comments on existing issues ===\n')

  await commentOnIdentifier(
    'HGT-17',
    `${TEST_CONTEXT}

**iOS PWA test batch (Jun 1)** — file as sub-findings for the 5-friend teardown:

- Plan page has no top/bottom nav — users feel trapped (see new urgent issue).
- Availability grid drag/erase UX unintuitive; refresh opens edit mode and users accidentally change marks.
- Long scroll to activity ideas; heatmap filter buttons unclear vs slider mental model.
- PWA does not live-update responses/upvotes until full app restart.
- Push: join notification worked; activity upvote notification did not.
- Cookies / identity persistence on PWA appears OK.`,
  )

  await commentOnIdentifier(
    'HGT-21',
    `${TEST_CONTEXT}

**Re-emphasized priority:** Rich link previews are **critical** for iMessage distribution — goal is meaningful preview *and* eventual in-thread interaction without opening the web page (iMessage app extension / interactive OG — out of v1 scope but validate static OG first).

Verify on real iMessage send: title, time window, response count, scheduled state.`,
  )

  await commentOnIdentifier(
    'HGT-28',
    `${TEST_CONTEXT}

**Push permission UX failures on PWA:**
- Tiny popup on launch; if user already has a plan, \`hangout_last_plan\` redirect skips the prompt entirely.
- One tester never saw the popup at all (needs repro steps / iOS version / permission state).
- Join notification **delivered**; **activity upvote notification did not** — verify allowlist + \`/api/push/*\` dispatch for vote events.

**Mitigation ideas:** persistent entry in Profile/settings; optional per-plan watch toggle; restoring nav chrome so users can reach settings (see nav chrome issue).`,
  )

  await commentOnIdentifier(
    'HGT-51',
    `${TEST_CONTEXT}

**Return-to-plan UX (PWA):** Opens home first, then redirects to last plan — feels laggy.

**Bug:** Do not redirect to an **expired** plan (\`expires_at\` / archived). Check \`/api/polls/last\` + home redirect in \`app/page.tsx\`.`,
  )

  await commentOnIdentifier(
    'HGT-44',
    `${TEST_CONTEXT}

**Product conflict — urgent tester feedback:** Hiding Nav + BottomNav on plan pages makes PWA users feel **trapped** with no path to home, settings, or notifications.

Sacred-path web link flow may still want minimal chrome, but **installed PWA** needs escape hatch. Consider:
- Scroll-reveal sticky header/footer (show on scroll up / after idle)
- Or always show compact bottom bar in standalone \`display-mode: standalone\`
- Or persistent "⋯" menu on plan pages

Reconcile with PRODUCT.md sacred path — don't add login walls; do allow navigation.`,
  )

  await commentOnIdentifier(
    'HGT-104',
    `${TEST_CONTEXT}

**Heatmap filter UX change request:** Replace "Everyone free" / "Mostly free" toggle buttons with a **slider**: 0 people free → 1 → 2 → … → *n* (where *n* = respondent count). Highlights grid cells matching exact overlap count.`,
  )

  await commentOnIdentifier(
    'HGT-49',
    `${TEST_CONTEXT}

**Copy tweak (respondent-facing):** Button text "Fix your name typo" reads oddly. Change to "Edit name" or similar. Location: \`PollPageClient.tsx\`.`,
  )

  await commentOnIdentifier(
    'HGT-19',
    `${TEST_CONTEXT}

**Auto-schedule bug on PWA:** Tapping auto-schedule shows error *"The string did not match the expected pattern"*; activity remains in ideas list (schedule may partially fail). Likely JSON parse / \`slot_key\` validation — repro on iOS PWA standalone.

**QoL:** After successful schedule, scroll viewport to scheduled block / calendar section instead of leaving user at bottom activities list.`,
  )

  await commentOnIdentifier(
    'HGT-15',
    `${TEST_CONTEXT}

**Positive:** PWA appears to remember user identity (httpOnly plan cookies working as intended).`,
  )

  await commentOnIdentifier(
    'HGT-85',
    `${TEST_CONTEXT}

**Navigation to activities:** On mobile plan page, scrolling to activity ideas at bottom takes too long (grid is ~2× viewport). Consider sticky FAB / side tab that opens section jump menu (Activities, Schedule, Availability).`,
  )

  console.log('\n=== New issues ===\n')

  await createIfNotDuplicate('plan creation speed', {
    title: 'Optimize plan creation flow (Create link → shareable URL)',
    description: `${TEST_CONTEXT}

**Problem:** Time from tapping "Create link" on \`/polls/new\` to having a shareable plan URL feels too long on iOS PWA.

**Ideas to investigate:**
- Profile POST \`/api/polls\` latency (DB inserts, date_options batch)
- Avoid blocking UI on non-critical work before redirect
- Pre-warm or parallelize slug generation + cookie writes
- Consider optimistic redirect with skeleton plan page (careful with sacred path perf — see HGT-83/89)
- Measure with \`performance.mark\` on create submit → \`/p/[slug]\` paint

**Project:** Performance & Optimization`,
    projectId: perfProjectId ?? MVP_PROJECT_ID,
    stateId: TODO,
    priority: 2,
  })

  await createIfNotDuplicate('share sheet', {
    title: 'Open iOS share sheet immediately after plan creation',
    description: `${TEST_CONTEXT}

After creating a plan, surface native share UI (\`navigator.share\` / Web Share API) so creator can immediately pick iMessage recipients.

**Brainstorm:**
- Auto-open share sheet on landing at \`/p/[slug]?fill=1\` (only once, creator-only)
- Fallback copy-link + "Share" CTA if \`navigator.share\` unavailable
- Must not block sacred-path strangers — creator-only gate via \`is_creator\` / cookie

Related: HGT-49 copy-link feedback.`,
    projectId: MVP_PROJECT_ID,
    stateId: BACKLOG,
    priority: 3,
  })

  await createIfNotDuplicate('availability grid rewrite', {
    title: 'Mobile availability grid UX rewrite (mark, erase, scroll)',
    description: `${TEST_CONTEXT}

**Problems (consider full reimplementation):**
1. Drag-to-select is finicky on iOS PWA
2. Erase gesture (swipe green → pause → bulk remove) is unintuitive
3. Grid is ~2× screen height — must scroll entire page to mark all times
4. No auto-scroll while dragging near viewport edge
5. **Feature ask:** tap day-of-week header (e.g. "Mon, Jun 1") to mark entire day available
6. **Maybe:** tap hour label on Y-axis to mark that hour free all week (needs design review)

**Files:** \`PollGrid.tsx\`, \`PollPageClient.tsx\`, \`lib/planRoutes.ts\`

**Sacred path:** must stay fast; no extra network before first paint (PERFORMANCE.md).

Supersedes incremental polish on HGT-23/24/25 if rewrite is chosen.`,
    projectId: MVP_PROJECT_ID,
    stateId: TODO,
    priority: 1,
  })

  await createIfNotDuplicate('nav chrome on plan', {
    title: 'Restore navigation chrome on plan pages (PWA escape hatch)',
    description: `${TEST_CONTEXT}

**Urgent — PWA testers trapped on plan page:** No top bar, no bottom bar, no way back to home/settings.

HGT-44 intentionally hid chrome for anonymous link flow. Need hybrid:
- **Standalone PWA:** show Nav and/or BottomNav (or scroll-reveal variant)
- **Cold link / Safari:** keep minimal chrome OR compact menu

Implementation ideas: \`display-mode: standalone\` check; scroll-direction reveal; persistent "Menu" / back affordance.

Blocks notification settings access and general wayfinding.

**Related:** HGT-44 (hide nav — reconcile).`,
    projectId: MVP_PROJECT_ID,
    stateId: TODO,
    priority: 1,
  })

  await createIfNotDuplicate('live updates on plan', {
    title: 'PWA plan page live updates (responses, votes, heatmap)',
    description: `${TEST_CONTEXT}

**Bug:** On installed iOS PWA, while viewing "Mark your availability":
- Friends' responses do not appear on the heatmap until **full app restart**
- New idea upvotes also stale until restart

**Expected:** Periodic poll refresh, \`visibilitychange\` refetch, or lightweight realtime (SSE/WebSocket — justify vs polling).

**Files:** \`PollPageClient.tsx\` (\`fetchPoll\`, \`fetchIdeas\`), possibly service worker cache invalidation.

Note: may interact with HGT-83 SSR \`initialData\` — ensure client refetch on focus.`,
    projectId: MVP_PROJECT_ID,
    stateId: TODO,
    priority: 1,
  })

  await createIfNotDuplicate('notification settings', {
    title: 'Easier push notification opt-in (settings + per-plan)',
    description: `${TEST_CONTEXT}

**Problem:** Enabling notifications is too hard — easy to miss launch popup; redirect to last plan dismisses it; one tester never saw popup.

**Scope:**
- Persistent "Notifications" section on \`/profile\` (re-request permission, explain iOS steps)
- Optional per-plan watch toggle (extends \`/api/push/watches\`)
- Re-show prompt when user navigates to settings, not only on first launch
- Debug path for "never saw prompt" (permission denied vs. standalone vs. SW not registered)

Parent: HGT-28. Partially unblocked by nav chrome on plan pages.`,
    projectId: MVP_PROJECT_ID,
    stateId: TODO,
    priority: 2,
  })

  await createIfNotDuplicate('Places autocomplete', {
    title: 'Activity idea location: Places autocomplete + maps deep link',
    description: `${TEST_CONTEXT}

**Problem:** Location field on activity ideas (\`PollIdeasBoard.tsx\`) is plain text — no address suggestions or verification.

**Desired:**
- Google Places autocomplete (reuse \`PlacesInput\` from profile — load Maps JS only here, aligns with HGT-82)
- Store display name (e.g. "Thai Basil") not raw street address when possible
- Tapping location opens Maps app (\`maps://\` / Google Maps URL)

**Out of scope:** full calendar-style venue management.`,
    projectId: MVP_PROJECT_ID,
    stateId: BACKLOG,
    priority: 3,
  })

  await createIfNotDuplicate('upvote responsiveness', {
    title: 'Idea upvote UI feels delayed (optimistic feedback)',
    description: `${TEST_CONTEXT}

**Problem:** Tapping upvote on an activity idea has noticeable lag before UI updates.

**Approach:** Optimistic vote count in \`PollIdeasBoard\`; rollback on API error; consider debounce only if double-tap is an issue.

Related perf: HGT-85 lazy-load may affect perceived latency.`,
    projectId: MVP_PROJECT_ID,
    stateId: BACKLOG,
    priority: 3,
  })

  await createIfNotDuplicate('name entry done button', {
    title: 'Desktop plan name entry: remove Done button friction',
    description: `${TEST_CONTEXT}

**Context:** Desktop web (not iOS PWA). Joining existing poll without account correctly prompts for name.

**Problem:** After entering name, user must click large "Done" button — slows flow, feels unintuitive.

**Ideas:**
- On blur, dim/grey out text field to signal saved; stay editable inline
- Or collapse to compact "Edit name" control after first save
- Keep accessible path to change name

**Files:** \`PollPageClient.tsx\` name form / \`handleNameSubmit\``,
    projectId: MVP_PROJECT_ID,
    stateId: BACKLOG,
    priority: 4,
  })

  await createIfNotDuplicate('refresh edit mode', {
    title: 'Mobile plan refresh: do not auto-open availability edit mode',
    description: `${TEST_CONTEXT}

**Problem:** Refreshing plan page on mobile immediately enters availability marking mode. Users returning to review their plan try to scroll and accidentally change marks.

**Desired behavior:**
- First visit (no saved response): focus name field; offer edit mode
- Return visit / refresh with existing response: **view mode** by default; explicit "Edit availability" to enter grid

Watch interaction with \`?fill=1\` creator flow and \`applyReturningIdentity\`.`,
    projectId: MVP_PROJECT_ID,
    stateId: TODO,
    priority: 2,
  })

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
