const API_KEY = process.env.LINEAR_API_KEY
if (!API_KEY) process.exit(1)

const IN_REVIEW = '5d177633-97dd-428d-a86d-eeb96b3ba93f'
const DONE = '74be5491-7f33-4c16-9062-4dfb7a244c37'

async function gql(query, variables = {}) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors))
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

const updates = [
  ['56a8ba21-545c-4785-8f75-442c4ceff2be', IN_REVIEW, 'Shipped: `isAnonymousPlanPage()` skips NameModal on `/p/*` and all `/polls/*` routes. Ready for HGT-17 test.'],
  ['HGT-44 lookup needed', DONE, ''],
]

// HGT-44 id from earlier create - need to fetch
const list = await gql(`{ team(id: "31a3624b-fdd7-45c7-86cd-bc6480015bf8") { issues(filter: { number: { eq: 44 } }) { nodes { id } } } }`)
const hgt44 = list.team.issues.nodes[0]?.id

const results = []
results.push(await update('56a8ba21-545c-4785-8f75-442c4ceff2be', IN_REVIEW, updates[0][2]))
if (hgt44) results.push(await update(hgt44, DONE, 'Shipped: BottomNav and top Nav hidden on plan respond pages via `isPlanRespondPage()`. MainShell adjusts padding.'))
results.push(await update('7e624126-1bd4-43d1-b01d-0f45d5dbd28a', IN_REVIEW, 'Shipped: grid cells now min-h-[44px]; tap mode defaults on mobile.'))
results.push(await update('d0400982-3ba7-4427-b655-4ea248c347ed', IN_REVIEW, 'Shipped: tap mode defaults on mobile; autosave copy updated.'))
results.push(await update('8290911c-c3b5-4bca-8a2f-516ccf742e58', IN_REVIEW, 'Shipped: 44px cells + 44px controls on plan page.'))
results.push(await update('87fb5822-24e0-4a65-8bcb-593788c36fa9', IN_REVIEW, 'Shipped: debounced save-as-you-go on grid toggle; explicit Save button removed.'))

console.log(results.map(i => `${i.identifier} -> ${i.state.name}`).join('\n'))
