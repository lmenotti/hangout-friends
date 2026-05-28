/**
 * Sync Linear issue states to match commit 284cb7a (May 28 sprint work).
 * Run: LINEAR_API_KEY=... node scripts/linear-sync-status.mjs
 */
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

const API_KEY = envValue('LINEAR_API_KEY')
if (!API_KEY) {
  console.error('Set LINEAR_API_KEY')
  process.exit(1)
}

const DONE = '74be5491-7f33-4c16-9062-4dfb7a244c37'
const IN_REVIEW = '5d177633-97dd-428d-a86d-eeb96b3ba93f'
const TODO = 'fdb7b465-aef1-43b9-bbf7-40c657ebcabd'

const COMMIT = '284cb7a'

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
    { id, input: { stateId } }
  )
  if (comment) {
    await gql(
      `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
      { input: { issueId: id, body: comment } }
    )
  }
  return data.issueUpdate.issue
}

/** @type {Array<[string, string, string | null]>} */
const updates = [
  [
    '56a8ba21-545c-4785-8f75-442c4ceff2be',
    DONE,
    `**Shipped (${COMMIT}).** \`isAnonymousPlanPage()\` skips NameModal on \`/p/*\` and all \`/polls/*\` routes. Unblocks HGT-17.`,
  ],
  [
    '87fb5822-24e0-4a65-8bcb-593788c36fa9',
    DONE,
    `**Shipped (${COMMIT}).** Debounced save-as-you-go on availability grid toggle; explicit Save button removed.`,
  ],
  [
    '7e624126-1bd4-43d1-b01d-0f45d5dbd28a',
    DONE,
    `**Shipped (${COMMIT}).** Grid cells \`min-h-[44px]\`; tap mode defaults on mobile.`,
  ],
  [
    'd0400982-3ba7-4427-b655-4ea248c347ed',
    DONE,
    `**Shipped (${COMMIT}).** Tap-to-toggle mode on plan grid; autosave copy updated.`,
  ],
  [
    '8290911c-c3b5-4bca-8a2f-516ccf742e58',
    DONE,
    `**Shipped (${COMMIT}).** 44px cells + 44px controls on plan respond page.`,
  ],
  [
    '0e37213e-2cf6-469b-b865-34f3596ec33a',
    DONE,
    `**Shipped (${COMMIT}).** \`/polls/[uuid]\` → \`/p/[slug]\` redirect; AASA includes \`/p/*\`; new plans use slug URLs.`,
  ],
  [
    'e2fd81ee-6fe1-4208-9f1d-d246dfc7552a',
    DONE,
    `**Shipped (${COMMIT}).** Signed-in home dashboard is plans-first (New plan + Pods). Legacy /availability, /ideas, /events removed from nav and home.`,
  ],
  [
    '38abadcd-0e3b-4bd6-a9f4-1c65d2d4c375',
    IN_REVIEW,
    `**MVP shipped (${COMMIT}).** Migration 021, \`/api/polls/[id]/ideas\` CRUD + voting, \`PollIdeasBoard\` on plan page. \`npm run test:plan-loop\` passes. Ready for manual QA.`,
  ],
  [
    '836ec170-90a0-496b-a6f6-dfc7ff24c4db',
    IN_REVIEW,
    `**MVP shipped (${COMMIT}).** \`/api/polls/[id]/schedule\`, \`lib/pollSchedule.ts\`, auto-schedule button locks poll to \`scheduled\`. E2E test passes.`,
  ],
  [
    '9038d115-7863-4aa9-b491-cac12b159551',
    IN_REVIEW,
    `**Status (${COMMIT}).** RSVP API + yes/maybe/no UI shipped; E2E passes. **Polish still open** — see prior QA comment (name lists, self-feedback, one-step RSVP flow, "who's coming" rollup). Close after polish + HGT-17 validation.`,
  ],
  [
    'f6c7bfb7-c87c-4dd5-8667-3075c0ca737a',
    TODO,
    `**Unblocked.** HGT-10 shipped in ${COMMIT}. This is Sprint 0 exit criteria per GOALS.md M1 — run 5-friend mobile Safari cold test now. Include scheduled-plan RSVP clarity (HGT-20 polish).`,
  ],
]

const results = []
for (const [id, stateId, comment] of updates) {
  results.push(await update(id, stateId, comment))
}

console.log(results.map(i => `${i.identifier} → ${i.state.name}`).join('\n'))
