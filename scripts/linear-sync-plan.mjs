/**
 * One-off script: sync Linear issues with MVP plan priorities.
 * Run: node scripts/linear-sync-plan.mjs
 */

const API_KEY = process.env.LINEAR_API_KEY
if (!API_KEY) {
  console.error('Set LINEAR_API_KEY')
  process.exit(1)
}

const STATES = {
  Backlog: '042e2f5a-217d-46de-90b4-a16bdc453b70',
  Todo: 'fdb7b465-aef1-43b9-bbf7-40c657ebcabd',
  InProgress: '289dccc3-4cdb-4f18-96b2-929d7769288a',
  InReview: '5d177633-97dd-428d-a86d-eeb96b3ba93f',
  Done: '74be5491-7f33-4c16-9062-4dfb7a244c37',
}

const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'
const PROJECT_ID = '0a48dfaa-e28a-4595-9b54-abef90cb0ccc'

async function gql(query, variables = {}) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2))
  }
  return json.data
}

async function updateIssue(id, input) {
  const data = await gql(
    `mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { identifier state { name } priority priorityLabel }
      }
    }`,
    { id, input }
  )
  return data.issueUpdate.issue
}

async function addComment(issueId, body) {
  await gql(
    `mutation($input: CommentCreateInput!) {
      commentCreate(input: $input) { success }
    }`,
    { input: { issueId, body } }
  )
}

async function createIssue(input) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { identifier url }
      }
    }`,
    { input: { teamId: TEAM_ID, projectId: PROJECT_ID, ...input } }
  )
  return data.issueCreate.issue
}

async function main() {
  const results = []

  const hgt10 = await updateIssue('56a8ba21-545c-4785-8f75-442c4ceff2be', {
    stateId: STATES.InProgress,
    priority: 1,
  })
  results.push(`${hgt10.identifier} -> ${hgt10.state.name} (${hgt10.priorityLabel})`)
  await addComment(
    '56a8ba21-545c-4785-8f75-442c4ceff2be',
    `**Code audit (May 28): fix is incomplete.** NameModal skip only applies to \`/polls/*\`, but all new share links redirect to \`/p/[slug]\`. Strangers opening shared links still hit the full-screen NameModal first.

**Remaining work:** extend skip to \`pathname.startsWith('/p/')\` in \`components/NameModal.tsx\`.

Blocks HGT-17 usability test.`
  )

  const hgt8 = await updateIssue('5d80d6ef-d838-4e12-807b-841da659c703', {
    stateId: STATES.Done,
  })
  results.push(`${hgt8.identifier} -> ${hgt8.state.name}`)
  await addComment(
    '5d80d6ef-d838-4e12-807b-841da659c703',
    '**Verified in codebase (May 28):** `/polls/new` requires no account, pre-selects next 7 days, and redirects to `/p/[slug]` on create. Meets done-when criteria.'
  )

  const hgt17 = await updateIssue('f6c7bfb7-c87c-4dd5-8667-3075c0ca737a', {
    stateId: STATES.Todo,
    priority: 1,
  })
  results.push(`${hgt17.identifier} -> ${hgt17.state.name} (${hgt17.priorityLabel})`)
  await addComment(
    'f6c7bfb7-c87c-4dd5-8667-3075c0ca737a',
    '**Sprint 0 exit criteria.** Run immediately after HGT-10 `/p/*` fix lands. This is the single most important validation task per GOALS.md M1.'
  )

  const hgt6 = await updateIssue('87fb5822-24e0-4a65-8bcb-593788c36fa9', {
    stateId: STATES.InProgress,
    priority: 2,
  })
  results.push(`${hgt6.identifier} -> ${hgt6.state.name} (${hgt6.priorityLabel})`)
  await addComment(
    '87fb5822-24e0-4a65-8bcb-593788c36fa9',
    `**Sprint 0 active work (May 28 plan):**
1. HGT-10 — fix \`/p/*\` NameModal regression (In Progress)
2. HGT-42 — hide BottomNav on plan respond pages (new)
3. Save-as-you-go availability (no explicit Save button)
4. HGT-23/24/25 — finish mobile grid polish
5. HGT-17 — 5-friend teardown test
6. HGT-21 — verify OG previews

Sprint 1: HGT-18 → HGT-19 → HGT-20 (plan lifecycle loop).`
  )

  const hgt35 = await updateIssue('0e37213e-2cf6-469b-b865-34f3596ec33a', {
    stateId: STATES.InProgress,
    priority: 2,
  })
  results.push(`${hgt35.identifier} -> ${hgt35.state.name} (${hgt35.priorityLabel})`)
  await addComment(
    '0e37213e-2cf6-469b-b865-34f3596ec33a',
    '**Mostly done (May 28):** migration 018, `/p/[slug]` route, new plans redirect to slug URLs, OG metadata wired.\n\n**Remaining:** permanent redirect `/polls/[uuid]` → `/p/[slug]`; update `apple-app-site-association` to include `/p/*`.'
  )

  const hgt7 = await updateIssue('e2fd81ee-6fe1-4208-9f1d-d246dfc7552a', {
    stateId: STATES.InProgress,
    priority: 2,
  })
  results.push(`${hgt7.identifier} -> ${hgt7.state.name} (${hgt7.priorityLabel})`)
  await addComment(
    'e2fd81ee-6fe1-4208-9f1d-d246dfc7552a',
    '**Partial (May 28):** legacy routes redirect; Nav/BottomNav updated. **Remaining:** signed-in home dashboard in `app/page.tsx` still links to `/availability`, `/ideas`, `/events`. Replace with plan/pod CTAs.'
  )

  await addComment(
    '7e624126-1bd4-43d1-b01d-0f45d5dbd28a',
    'Tap mode exists but grid cells are still ~20px tall in PollGrid.tsx. Increase to ≥44px to meet done-when.'
  )
  await addComment(
    'd0400982-3ba7-4427-b655-4ea248c347ed',
    'Tap mode implemented in PollPageClient. Default tap mode on mobile still recommended.'
  )
  await addComment(
    '8290911c-c3b5-4bca-8a2f-516ccf742e58',
    'Mode toggle buttons are 44px; grid cells are not. Finish cell sizing audit.'
  )
  await addComment(
    '5288304f-1c1c-4de9-8c7c-b7a2e40337f4',
    'Migration 017_drop_approved_names.sql already applied. Verify no remaining references, then close.'
  )

  const hgt42 = await createIssue({
    title: 'Hide BottomNav on plan respond pages',
    description: `BottomNav currently shows on all non-admin routes, including \`/p/[slug]\` and \`/polls/[id]\`. For the sacred one-shot respond flow, hide BottomNav (and optionally top Nav) on plan respond pages.

**Why:** Extra chrome adds friction to the iMessage link → mark availability → leave path.

**Done when:** Opening a shared plan link shows only the plan content, no tab bar.`,
    priority: 2,
    stateId: STATES.Todo,
  })
  results.push(`Created ${hgt42.identifier}: ${hgt42.url}`)

  console.log(results.join('\n'))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
