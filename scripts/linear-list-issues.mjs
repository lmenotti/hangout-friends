const API_KEY = process.env.LINEAR_API_KEY
if (!API_KEY) process.exit(1)

const res = await fetch('https://api.linear.app/graphql', {
  method: 'POST',
  headers: { Authorization: API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `{ team(id: "31a3624b-fdd7-45c7-86cd-bc6480015bf8") {
      issues(first: 50, orderBy: updatedAt) {
        nodes { identifier title priorityLabel state { name } project { name } url }
      }
    } }`,
  }),
})
const { data } = await res.json()
data.team.issues.nodes
  .sort((a, b) => parseInt(a.identifier.slice(4)) - parseInt(b.identifier.slice(4)))
  .forEach(i => {
    console.log([i.identifier, i.priorityLabel, i.state.name, i.project?.name ?? '', i.title].join('\t'))
  })
