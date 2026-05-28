/**
 * Sync Linear issue states after Waves 0–3 (May 28, 2026).
 * Run: node scripts/linear-sync-status.mjs
 */
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

const API_KEY = envValue('LINEAR_API_KEY')
if (!API_KEY) {
  console.error('Set LINEAR_API_KEY in .env.secrets.local')
  process.exit(1)
}

const STATES = {
  Backlog: '042e2f5a-217d-46de-90b4-a16bdc453b70',
  Todo: 'fdb7b465-aef1-43b9-bbf7-40c657ebcabd',
  Done: '74be5491-7f33-4c16-9062-4dfb7a244c37',
}

const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'
const PROJECT_ID = '0a48dfaa-e28a-4595-9b54-abef90cb0ccc'
const SYNC_DATE = 'May 28, 2026'

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

async function update(id, stateId, comment) {
  const data = await gql(
    `mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) { success issue { identifier state { name } } }
    }`,
    { id, input: { stateId } },
  )
  if (comment) {
    await gql(
      `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
      { input: { issueId: id, body: comment } },
    )
  }
  return data.issueUpdate.issue
}

async function findIssue(identifier) {
  const num = parseInt(identifier.replace(/^HGT-/i, ''), 10)
  const data = await gql(
    `query($teamId: String!, $num: Float!) {
      team(id: $teamId) {
        issues(filter: { number: { eq: $num } }) {
          nodes { id identifier title state { name } }
        }
      }
    }`,
    { teamId: TEAM_ID, num },
  )
  return data.team.issues.nodes[0] ?? null
}

async function findIssueByTitleContains(substring) {
  const data = await gql(
    `query($teamId: String!) {
      team(id: $teamId) {
        issues(first: 100, orderBy: updatedAt) {
          nodes { id identifier title state { name } }
        }
      }
    }`,
    { teamId: TEAM_ID },
  )
  const lower = substring.toLowerCase()
  return (
    data.team.issues.nodes.find((i) => i.title.toLowerCase().includes(lower)) ?? null
  )
}

async function createBacklogIssue(title, description) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url state { name } }
      }
    }`,
    {
      input: {
        teamId: TEAM_ID,
        projectId: PROJECT_ID,
        title,
        description,
        stateId: STATES.Backlog,
      },
    },
  )
  return data.issueCreate.issue
}

/** @type {Array<[string, string, string | null]>} id or HGT-XX, state key, comment */
const KNOWN_UPDATES = [
  ['HGT-6', 'Done', `**Shipped (${SYNC_DATE}).** Save-as-you-go availability; explicit Save removed.`],
  ['HGT-7', 'Done', `**Shipped (${SYNC_DATE}).** Plans-first home; legacy surfaces off nav.`],
  ['HGT-8', 'Done', `**Shipped (${SYNC_DATE}).** Plan creation at \`/polls/new\` → \`/p/[slug]\`; no account required.`],
  ['HGT-10', 'Done', `**Shipped (${SYNC_DATE}).** NameModal skipped on \`/p/*\` and \`/polls/*\`.`],
  ['HGT-23', 'Done', `**Shipped (${SYNC_DATE}).** 44px grid cells on plan respond page.`],
  ['HGT-24', 'Done', `**Shipped (${SYNC_DATE}).** Tap-to-toggle default on mobile.`],
  ['HGT-25', 'Done', `**Shipped (${SYNC_DATE}).** 44px controls on plan respond page.`],
  ['HGT-35', 'Done', `**Shipped (${SYNC_DATE}).** Slug URLs at \`/p/[slug]\`; UUID redirect; AASA \`/p/*\`.`],
  ['HGT-44', 'Done', `**Shipped (${SYNC_DATE}).** BottomNav + top Nav hidden on plan respond pages.`],
  ['HGT-18', 'Done', `**Shipped (${SYNC_DATE}).** Plan ideas + voting. \`npm run test:plan-loop\` passes.`],
  ['HGT-19', 'Done', `**Shipped (${SYNC_DATE}).** Auto-schedule + lock to \`scheduled\`. E2E passes.`],
  ['HGT-20', 'Done', `**Shipped (${SYNC_DATE}).** RSVP + heatmap drill-down polish. E2E passes. Human sign-off via HGT-17.`],
  [
    'HGT-21',
    'Done',
    `**Code shipped (${SYNC_DATE}).** OG route + scheduled-state metadata. **Platform verify tomorrow** — iMessage, WhatsApp, Discord, Slack.`,
  ],
  ['HGT-27', 'Done', `**Shipped (${SYNC_DATE}).** PWA manifest, icons, \`InstallPrompt\`. Device install test deferred.`],
  ['HGT-15', 'Done', `**Shipped (${SYNC_DATE}).** Per-plan httpOnly cookie via \`lib/planIdentity.ts\` (respond + RSVP).`],
  [
    'HGT-28',
    'Done',
    `**Shipped (${SYNC_DATE}).** migration 023, service worker, 3 allowlisted push types. **Device test deferred** — \`Notification.requestPermission\` UI still needed before real-device validation.`,
  ],
  [
    'HGT-29',
    'Done',
    `**Shipped (${SYNC_DATE}).** Google Calendar OAuth (\`/api/google/auth\`, callback rewrite). Prod OAuth smoke test deferred.`,
  ],
  [
    'HGT-34',
    'Done',
    `**Shipped (${SYNC_DATE}).** Calendar read-only pre-fill wired with HGT-29 OAuth. Prod smoke test deferred.`,
  ],
  [
    'HGT-17',
    'Todo',
    `**Human validation tomorrow.** 5-friend mobile Safari cold test — Sprint 0 exit criteria (GOALS M1). Waves 0–3 code complete.`,
  ],
  ['HGT-11', 'Backlog', `**Wave 4 (optional).** Email + magic link auth — deferred post Waves 0–3.`],
  ['HGT-13', 'Backlog', `**Wave 4 (optional).** Magic link auth — deferred post Waves 0–3.`],
  ['HGT-22', 'Backlog', `**Wave 4 (optional).** Top-3 auto-schedule candidate picker — deferred.`],
]

const results = []

for (const [ref, stateKey, comment] of KNOWN_UPDATES) {
  const issue = ref.startsWith('HGT-')
    ? await findIssue(ref)
    : { id: ref, identifier: ref }
  if (!issue?.id) {
    results.push(`${ref} → NOT FOUND`)
    continue
  }
  const updated = await update(issue.id, STATES[stateKey], comment)
  results.push(`${updated.identifier} → ${updated.state.name}`)
}

let ics = await findIssueByTitleContains('ics')
if (!ics) ics = await findIssueByTitleContains('add to calendar')
if (!ics) {
  const created = await createBacklogIssue(
    'ICS export for scheduled plans',
    `**Wave 4 (optional).** One-shot "Add to calendar" on scheduled plans.

**Scope:** new API route + button on scheduled plan page (\`PollPageClient.tsx\`).

**Done when:** User can download/add .ics for locked plan time without Google OAuth.`,
  )
  results.push(`${created.identifier} → ${created.state.name} (created)`)
} else if (ics.state.name !== 'Backlog' && ics.state.name !== 'Todo') {
  results.push(`${ics.identifier} → ${ics.state.name} (unchanged — already tracked)`)
} else {
  const updated = await update(
    ics.id,
    STATES.Backlog,
    `**Wave 4 (optional).** ICS export deferred post Waves 0–3.`,
  )
  results.push(`${updated.identifier} → ${updated.state.name}`)
}

console.log(results.join('\n'))
