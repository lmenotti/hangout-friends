/**
 * Create HGT-15 sub-issue for RSVP cookie, then mark Done after implementation.
 * Run: node scripts/linear-rsvp-cookie-issue.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

function apiKeyFromMcpConfig() {
  const mcpPath = resolve(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    '.cursor/mcp.json',
  )
  if (!existsSync(mcpPath)) return undefined
  try {
    const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'))
    const servers = mcp.mcpServers ?? {}
    for (const name of ['linear-hangout', 'linear-quokka', 'linear', 'user-linear-hangout']) {
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
  console.error('Set LINEAR_API_KEY in .env.secrets.local or ~/.cursor/mcp.json')
  process.exit(1)
}

const HGT15_PARENT_ID = '62a2e91b-e46b-44aa-957a-70ebc0a1664a'

const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'
const PROJECT_ID = '0a48dfaa-e28a-4595-9b54-abef90cb0ccc'
const DONE = '74be5491-7f33-4c16-9062-4dfb7a244c37'
const HGT15_IDENTIFIER = 'HGT-15'

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

async function main() {
  const parentData = await gql(
    `query($id: String!) { issue(id: $id) { id identifier title } }`,
    { id: HGT15_PARENT_ID },
  )
  const parent = parentData.issue
  if (!parent) throw new Error(`Could not find ${HGT15_IDENTIFIER} parent issue`)

  console.log(`Parent: ${parent.identifier} — ${parent.title}`)

  const created = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }`,
    {
      input: {
        teamId: TEAM_ID,
        projectId: PROJECT_ID,
        parentId: parent.id,
        title: 'Set plan identity cookie on RSVP',
        description: `Follow-up to ${parent.identifier}: anonymous users who only RSVP on a scheduled plan (never saved availability) should still get the per-plan \`hangout_plan_{pollId}\` httpOnly cookie.

**Scope:** \`POST /api/polls/[id]/rsvp\` — same \`appendPlanIdentityCookie\` as respond route; first-name normalization via \`normalizePlanIdentityName\`.

**Done when:** RSVP yes/maybe/no sets cookie; reload restores name on scheduled plan page.`,
        stateId: DONE,
      },
    },
  )

  const issue = created.issueCreate.issue
  console.log(`Created: ${issue.identifier} — ${issue.url}`)

  await gql(
    `mutation($input: CommentCreateInput!) {
      commentCreate(input: $input) { success }
    }`,
    {
      input: {
        issueId: issue.id,
        body: `**Shipped.** \`app/api/polls/[id]/rsvp/route.ts\` now calls \`appendPlanIdentityCookie\` on successful RSVP create/update, matching the respond route. Name normalized to first token.`,
      },
    },
  )

  await gql(
    `mutation($input: CommentCreateInput!) {
      commentCreate(input: $input) { success }
    }`,
    {
      input: {
        issueId: parent.id,
        body: `Sub-issue **${issue.identifier}** (${issue.url}): RSVP cookie support — Done.`,
      },
    },
  )

  console.log(`Marked ${issue.identifier} as Done with implementation comment.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
