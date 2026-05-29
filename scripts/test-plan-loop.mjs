#!/usr/bin/env node
/**
 * End-to-end API test of the plan loop (create → respond → ideas → schedule → RSVP).
 *
 * Usage:
 *   node scripts/test-plan-loop.mjs
 *   BASE_URL=http://localhost:3000 node scripts/test-plan-loop.mjs
 *
 * Requires the app running and Supabase env vars configured (see README).
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { ok: res.ok, status: res.status, json, text }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  console.log(`Testing plan loop against ${BASE}\n`)

  const today = new Date()
  const d1 = new Date(today)
  d1.setDate(today.getDate() + 1)
  const d2 = new Date(today)
  d2.setDate(today.getDate() + 2)
  const iso = (d) => d.toISOString().slice(0, 10)

  // 1. Create plan
  const create = await req('/api/polls', {
    method: 'POST',
    body: JSON.stringify({
      title: 'E2E plan loop test',
      creator_name: 'TestCreator',
      date_options: [iso(d1), iso(d2)],
    }),
  })
  assert(create.ok, `Create plan failed (${create.status}): ${create.text}`)
  const pollId = create.json.id
  const slug = create.json.slug
  console.log(`✓ Created plan ${pollId} → /p/${slug}`)

  // 2. Mark availability (two people, overlapping slot)
  const slot = `${iso(d1)}-14-0`
  for (const name of ['Alice', 'Bob']) {
    const r = await req(`/api/polls/${pollId}/respond`, {
      method: 'POST',
      body: JSON.stringify({
        respondent_name: name,
        availability: { [slot]: true, [`${iso(d1)}-15-0`]: true },
      }),
    })
    assert(r.ok, `${name} availability failed (${r.status}): ${r.text}`)
    console.log(`✓ ${name} marked availability`)
  }

  // 3. Add idea + votes
  const idea = await req(`/api/polls/${pollId}/ideas`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Coffee hangout', created_by_name: 'Alice' }),
  })
  assert(idea.ok, `Add idea failed (${idea.status}): ${idea.text}`)
  const ideaId = idea.json.id
  console.log(`✓ Idea created: ${ideaId}`)

  for (const name of ['Alice', 'Bob']) {
    const v = await req(`/api/polls/${pollId}/ideas/${ideaId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ respondent_name: name }),
    })
    assert(v.ok, `Vote by ${name} failed (${v.status}): ${v.text}`)
  }
  console.log('✓ Alice and Bob upvoted the idea')

  // 4. Auto-schedule (preview candidates, then confirm)
  const preview = await req(`/api/polls/${pollId}/schedule`, { method: 'POST' })
  assert(preview.ok, `Schedule preview failed (${preview.status}): ${preview.text}`)
  assert(preview.json.candidates?.length >= 1, 'Expected at least one schedule candidate')
  const pick = preview.json.candidates[0]
  console.log(`✓ Schedule preview: ${preview.json.candidates.length} option(s), top: ${pick.reason}`)

  const schedule = await req(`/api/polls/${pollId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ slot_key: pick.slot_key, idea_id: pick.idea_id }),
  })
  assert(schedule.ok, `Auto-schedule confirm failed (${schedule.status}): ${schedule.text}`)
  assert(schedule.json.poll?.status === 'scheduled', 'Poll status should be scheduled')
  console.log(`✓ Auto-scheduled: ${schedule.json.message}`)

  // 5. RSVP
  const rsvp = await req(`/api/polls/${pollId}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ respondent_name: 'Alice', status: 'yes' }),
  })
  assert(rsvp.ok, `RSVP failed (${rsvp.status}): ${rsvp.text}`)
  console.log('✓ Alice RSVP yes')

  // 6. Fetch full poll state
  const poll = await req(`/api/polls/${pollId}`)
  assert(poll.ok, `GET poll failed (${poll.status})`)
  assert(poll.json.rsvps?.length >= 1, 'Expected at least one RSVP')
  console.log('✓ Poll state includes RSVPs')

  console.log(`\nAll steps passed. Open in browser:\n  ${BASE}/p/${slug}\n`)
}

main().catch(err => {
  console.error('\n✗', err.message)
  console.error('\nIf ideas/schedule/RSVP fail with column/table errors, run:')
  console.error('  node scripts/migrate.mjs')
  console.error('  node scripts/verify-migration-021.mjs')
  process.exit(1)
})
