/**
 * File privacy / data-protection backlog in Linear (Jun 2026).
 * Run: node scripts/linear-privacy-data-jun2026.mjs
 */
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

const API_KEY = envValue('LINEAR_API_KEY')
if (!API_KEY) {
  console.error('Set LINEAR_API_KEY in .env.local')
  process.exit(1)
}

const TEAM_ID = '31a3624b-fdd7-45c7-86cd-bc6480015bf8'
const MVP_PROJECT_ID = '0a48dfaa-e28a-4595-9b54-abef90cb0ccc'
const BACKLOG = '042e2f5a-217d-46de-90b4-a16bdc453b70'

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

async function searchIssues(term) {
  const data = await gql(
    `query($term: String!) {
      searchIssues(term: $term, first: 10) {
        nodes { id identifier title url }
      }
    }`,
    { term },
  )
  return data.searchIssues.nodes
}

async function createIssue(input) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { identifier url title }
      }
    }`,
    { input: { teamId: TEAM_ID, projectId: MVP_PROJECT_ID, ...input } },
  )
  return data.issueCreate.issue
}

async function addComment(issueId, body) {
  await gql(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
    { input: { issueId, body } },
  )
}

async function findByIdentifier(identifier) {
  const num = parseInt(identifier.replace(/^HGT-/i, ''), 10)
  const data = await gql(
    `query($teamId: String!, $num: Float!) {
      team(id: $teamId) {
        issues(filter: { number: { eq: $num } }) {
          nodes { id identifier }
        }
      }
    }`,
    { teamId: TEAM_ID, num },
  )
  return data.team.issues.nodes[0] ?? null
}

const DESCRIPTION = `## Context

Operator can read raw rows in Supabase Table Editor (emails, tokens, plan names, first names). That is **dashboard/service-role access**, not public API exposure. RLS **026 (HGT-109)** already blocks anon reads of \`users\`.

Still, a privacy-conscious app should **minimize**, **protect secrets**, and **expire** data — not blanket-encrypt plan titles or respondent first names (those are visible to plan participants by design).

**Doc:** \`docs/PRIVACY.md\` (inventory, threat model, roadmap).

## Near-term implementation

1. **Encrypt at application layer:** \`users.google_refresh_token\` (and related) with AES-GCM + \`TOKEN_ENCRYPTION_KEY\` env; decrypt only in \`lib/googleCalendar.ts\`.
2. **Hash, do not store plaintext:** \`users.token\` (session), \`magic_link_tokens.token\` (verify via hash).
3. **Cron:** purge expired \`magic_link_tokens\` rows.
4. **Retention:** optional hard-delete poll/responses N days after \`archived_at\` (today 022 only archives).

## Out of scope for this issue

- Encrypting \`respondent_name\` or plan titles (breaks product; does not hide data from link holders).
- Full email anonymization (magic link needs lookup).

## Verify

- [ ] No plaintext refresh token in DB after connect flow (spot-check one row)
- [ ] Magic link + session auth still work after token hashing
- [ ] \`npm run build\`
- [ ] Update docs/PRIVACY.md if behavior changes

## Related

- HGT-109 (RLS tighten)
- PRODUCT.md principle: No surveillance vibes`

async function main() {
  const title = 'Data protection: encrypt secrets, hash tokens, retention'
  const hits = await searchIssues('Data protection encrypt secrets')
  const existing = hits.find(i => i.title === title)
  if (existing) {
    console.log(`Exists ${existing.identifier}: ${existing.url}`)
    return
  }

  const issue = await createIssue({
    title,
    description: DESCRIPTION,
    stateId: BACKLOG,
    priority: 3,
  })
  console.log(`Created ${issue.identifier}: ${issue.url}`)

  const hgt109 = await findByIdentifier('HGT-109')
  if (hgt109) {
    await addComment(
      hgt109.id,
      `Follow-up: **${issue.identifier}** — RLS stops anon API reads; see \`docs/PRIVACY.md\` for encrypting OAuth/session tokens and retention (dashboard visibility is operator access, not a substitute for secret protection).`,
    )
    console.log('Commented HGT-109')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
