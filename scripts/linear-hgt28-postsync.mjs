/**
 * Post-sync HGT-28 comment + Done state (May 28, 2026).
 * Run: node scripts/linear-hgt28-postsync.mjs
 */
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

const API_KEY = envValue('LINEAR_API_KEY')
if (!API_KEY) {
  console.error('Set LINEAR_API_KEY in .env.secrets.local')
  process.exit(1)
}

const DONE = '74be5491-7f33-4c16-9062-4dfb7a244c37'
const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'

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

const comment = `**Post-sync push UX (May 28, 2026).** Permission prompt shipped (\`PushNotificationPrompt\` on non-respond pages; Enable → \`Notification.requestPermission()\` → subscribe). \`/api/push/watches\` reads httpOnly \`hangout_plan_*\` cookies server-side (fixes plan watches invisible to \`document.cookie\`). Client logic in \`lib/pushSubscribeClient.ts\`. **Device delivery test still pending tomorrow** — verify subscribe + notification delivery on real iPhone/Android.`

const data = await gql(
  `query($teamId: String!, $num: Float!) {
    team(id: $teamId) {
      issues(filter: { number: { eq: $num } }) {
        nodes { id identifier state { name } }
      }
    }
  }`,
  { teamId: TEAM_ID, num: 28 },
)

const issue = data.team.issues.nodes[0]
if (!issue) throw new Error('HGT-28 not found')

await gql(
  `mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) { success issue { identifier state { name } } }
  }`,
  { id: issue.id, input: { stateId: DONE } },
)

await gql(
  `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
  { input: { issueId: issue.id, body: comment } },
)

console.log(`${issue.identifier} → Done (post-sync comment added)`)
