/**
 * Align HGT-91 auth epic with research-backed strategy (Jun 2026).
 * Run: node scripts/linear-auth-strategy-jun2026.mjs
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
const TODO = 'fdb7b465-aef1-43b9-bbf7-40c657ebcabd'

const LABEL_DEPRIORITIZED = '35a127dd-8eb2-4a8e-ad67-373ba2c4ba34'
const LABEL_MIGHT_REMOVE = 'd014b1d2-6949-4438-925a-4ecbfca91807'

const REVIEW_NOTE = `**Auth strategy review (Jun 1, 2026)** — Research-backed alignment with GOALS.md wedge (link-first, anonymous respond). Sacred path unchanged: first name + per-plan cookie only on \`/p/*\`.

**Near-term v1 auth:** Email magic link only on \`/auth/signin\` — polish deliverability, copy, error states (see new child issue if created).

**Deprioritized / might be removed:** May 2026 "multi-method" plan (SMS co-primary, password, SSO wall) conflicts with literature. Issues tagged accordingly — not deleted.

**Docs:** \`docs/PRODUCT.md\` §9, \`docs/README.md\`, \`docs/AGENT_WORK.md\`.`

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
          nodes { id identifier title labels { nodes { id name } } }
        }
      }
    }`,
    { teamId: TEAM_ID, num },
  )
  return data.team.issues.nodes[0] ?? null
}

async function addComment(issueId, body) {
  await gql(
    `mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
    { input: { issueId, body } },
  )
}

function mergeLabels(existing, ...add) {
  const ids = new Set(existing.map(l => l.id))
  for (const id of add) ids.add(id)
  return [...ids]
}

async function updateIssue(id, input, existingLabels = []) {
  if (input.addLabels) {
    input.labelIds = mergeLabels(existingLabels, ...input.addLabels)
    delete input.addLabels
  }
  const data = await gql(
    `mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { identifier state { name } priority priorityLabel labels { nodes { name } } }
      }
    }`,
    { id, input },
  )
  return data.issueUpdate.issue
}

async function createIssue(input) {
  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url title }
      }
    }`,
    { input: { teamId: TEAM_ID, projectId: MVP_PROJECT_ID, ...input } },
  )
  return data.issueCreate.issue
}

async function searchIssues(term) {
  const data = await gql(
    `query($term: String!) {
      searchIssues(term: $term, first: 10) {
        nodes { id identifier title }
      }
    }`,
    { term },
  )
  return data.searchIssues.nodes
}

const HGT91_DESCRIPTION = `## Goal (updated Jun 2026)

**Passwordless, lazy accounts** for Pods / history / calendar — not a multi-method login wall. Plan link respond stays anonymous-first (no account on \`/p/*\`).

## Near-term (v1)

* **Email magic link** — shipped ([HGT-13](https://linear.app/hangout-friends/issue/HGT-13)); polish UX + deliverability (child issue)
* **Sacred path** — no changes; per-plan cookie + first name only

## Step-up / medium-term (separate child issues)

* **SMS OTP** — only for high-risk actions + account recovery ([HGT-93](https://linear.app/hangout-friends/issue/HGT-93)), **not** co-primary login
* **Passkeys** — medium-term power users ([HGT-95](https://linear.app/hangout-friends/issue/HGT-95))

## Deprioritized / might be removed (tagged, kept for history)

* Phone+email tabs UI shell ([HGT-92](https://linear.app/hangout-friends/issue/HGT-92)) — deprioritized
* Password ([HGT-94](https://linear.app/hangout-friends/issue/HGT-94)) — might be removed
* Google / Apple identity SSO ([HGT-96](https://linear.app/hangout-friends/issue/HGT-96), [HGT-97](https://linear.app/hangout-friends/issue/HGT-97)) — might be removed

## References

* \`docs/PRODUCT.md\` §9, \`docs/AGENT_WORK.md\`
* Research review: frictionless sacred path + magic link accounts + step-up MFA for rare destructive actions`

async function main() {
  const parent = await findByIdentifier('HGT-91')
  if (!parent) throw new Error('HGT-91 not found')

  console.log('\n=== HGT-91 parent ===\n')
  await updateIssue(parent.id, {
    title: 'Account sign-in strategy (v1) — magic link first',
    description: HGT91_DESCRIPTION,
    priority: 2,
  })
  await addComment(parent.id, REVIEW_NOTE)
  console.log('  updated HGT-91')

  const children = {
    'HGT-92': {
      addLabels: [LABEL_DEPRIORITIZED],
      priority: 4,
      stateId: BACKLOG,
      description: `## Status: Deprioritized (Jun 2026)

Originally: email + phone tabs on \`/auth/signin\`. **Superseded** by research-backed strategy: single primary method (email magic link). Keep issue for history; do not build phone tabs unless product direction reverses.

If revived, scope narrows to **magic-link polish only** (Autofill, error copy, 16px inputs) — not dual primary methods.`,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Deprioritized. Do not implement email+phone equal tabs.`,
    },
    'HGT-93': {
      addLabels: [LABEL_DEPRIORITIZED],
      priority: 4,
      stateId: BACKLOG,
      description: `## Status: Deprioritized — re-scoped (Jun 2026)

**Not** co-primary sign-in on \`/auth/signin\` (NIST/SIM-swap concerns; conflicts with sacred-path thesis).

**New scope when built:** SMS OTP as **step-up** only:
* Account recovery
* High-risk actions (e.g. delete all pods, disconnect Google Calendar)

Use hardened OTP patterns where feasible. Provider TBD (Twilio Verify, etc.) — see README env vars.`,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Re-scoped to step-up/recovery only — not routine login.`,
    },
    'HGT-94': {
      addLabels: [LABEL_MIGHT_REMOVE],
      priority: 4,
      stateId: BACKLOG,
      description: `## Status: Might be removed (Jun 2026)

Password sign-in adds friction and security debt vs passwordless magic link (literature review). [HGT-78](https://linear.app/hangout-friends/issue/HGT-78) was canceled for post-v1; re-opening under HGT-91 was a mistake.

**Recommendation:** Cancel again or leave tagged; \`/auth/signin/options\` stub already directs users to magic link.`,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Might be removed — prefer magic link + future passkeys.`,
    },
    'HGT-95': {
      addLabels: [LABEL_DEPRIORITIZED],
      priority: 4,
      stateId: BACKLOG,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Deprioritized to medium-term — good fit for power planners after M1 validation.`,
    },
    'HGT-96': {
      addLabels: [LABEL_MIGHT_REMOVE],
      priority: 4,
      stateId: BACKLOG,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Might be removed — Google **Calendar** OAuth (HGT-29/34) remains; identity SSO is optional and crowds sign-in. Add only if users demand.`,
    },
    'HGT-97': {
      addLabels: [LABEL_MIGHT_REMOVE],
      priority: 4,
      stateId: BACKLOG,
      comment: `${REVIEW_NOTE}\n\n**This issue:** Might be removed — Apple Sign In deferred; Apple Dev Program friction. Revisit post-M1.`,
    },
  }

  for (const [id, spec] of Object.entries(children)) {
    const issue = await findByIdentifier(id)
    if (!issue) {
      console.warn(`  skip ${id} — not found`)
      continue
    }
    const { comment, addLabels, ...input } = spec
    await updateIssue(issue.id, { ...input, addLabels }, issue.labels.nodes)
    if (comment) await addComment(issue.id, comment)
    console.log(`  updated ${id}`)
  }

  console.log('\n=== New child issues (if missing) ===\n')

  const polishTitle = 'Polish email magic-link sign-in UX'
  const polishHits = await searchIssues('Polish email magic-link')
  let polish = polishHits.find(i => i.title === polishTitle)
  if (!polish) {
    polish = await createIssue({
      parentId: parent.id,
      title: polishTitle,
      description: `## What

Improve the **only** v1 account sign-in path (\`/auth/signin\` → email magic link).

## Scope

* Clear copy (new vs returning, link expiry)
* Error states (invalid email, rate limit, Resend failures)
* Mobile Autofill (\`autocomplete="email"\`, 16px+ inputs — partially done in \`AuthEmailForm\`)
* Deliverability monitoring (Resend domain \`mail.tryhangout.com\`)

## Out of scope

* Additional sign-in methods on this page
* Sacred \`/p/*\` flow

Parent: [HGT-91](https://linear.app/hangout-friends/issue/HGT-91)`,
      stateId: TODO,
      priority: 2,
    })
    console.log(`  created ${polish.identifier}: ${polish.url}`)
  } else {
    console.log(`  exists ${polish.identifier}`)
  }

  const nudgeTitle = 'Lazy account prompts at success moments'
  const nudgeHits = await searchIssues('Lazy account prompts')
  let nudge = nudgeHits.find(i => i.title === nudgeTitle)
  if (!nudge) {
    nudge = await createIssue({
      parentId: parent.id,
      title: nudgeTitle,
      description: `## What

Contextual, single-choice prompts when an anonymous user has already received value — **not** upfront sign-in walls.

## Examples

* After first Pod create: "Keep this group together?" → magic link to save
* Before calendar connect on Profile: explain why account helps
* Optional: after marking availability on a plan they created

## Principles

* One screen, one CTA (literature: light usage-type nudges)
* Never block sacred respond flow
* Link to \`/auth/signin?returnTo=...\`

Parent: [HGT-91](https://linear.app/hangout-friends/issue/HGT-91)`,
      stateId: BACKLOG,
      priority: 3,
    })
    console.log(`  created ${nudge.identifier}: ${nudge.url}`)
  } else {
    console.log(`  exists ${nudge.identifier}`)
  }

  const hgt78 = await findByIdentifier('HGT-78')
  if (hgt78) {
    await addComment(
      hgt78.id,
      `${REVIEW_NOTE}\n\nHGT-94 (password) is now tagged **Might be removed**. Original cancel decision stands — do not resurrect password for v1.`,
    )
    console.log('  commented HGT-78')
  }

  console.log('\nDone.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
