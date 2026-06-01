#!/usr/bin/env node
/**
 * Rough before/after timing for the plan link path.
 *
 * Usage:
 *   node scripts/measure-plan-page.mjs <slug>
 *   PLAN_SLUG=my-plan node scripts/measure-plan-page.mjs
 *
 * BASE_URL defaults to http://localhost:3000 (dev server must be running).
 * Measures TTFB for HTML and optional API round-trips (legacy client waterfall).
 */

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const slug = process.argv[2] ?? process.env.PLAN_SLUG
const pollIdArg = process.argv[3] ?? process.env.PLAN_ID

if (!slug) {
  console.error('Usage: node scripts/measure-plan-page.mjs <slug> [poll-id]')
  process.exit(1)
}

async function timedFetch(label, url, init) {
  const start = performance.now()
  const res = await fetch(url, init)
  const ms = Math.round(performance.now() - start)
  const ttfb = res.headers.get('x-vercel-id') ? '' : ''
  console.log(`${label.padEnd(28)} ${ms}ms  HTTP ${res.status}${ttfb}`)
  return { res, ms }
}

async function main() {
  console.log(`Base: ${baseUrl}`)
  console.log(`Plan: /p/${slug}\n`)

  const html = await timedFetch('GET /p/[slug] (HTML)', `${baseUrl}/p/${encodeURIComponent(slug)}`)

  const pollId = pollIdArg

  if (!pollId) {
    console.log('\nPass poll UUID as 2nd arg to time legacy API waterfall (optional).')
    console.log('After SSR (phase 2), first paint should not need those API calls.')
    return
  }

  console.log(`Poll id: ${pollId}\n`)
  console.log('Legacy client waterfall (should be unnecessary after SSR):')
  await timedFetch('GET /api/polls/[id]', `${baseUrl}/api/polls/${pollId}`)
  await timedFetch('GET /api/polls/[id]/ideas', `${baseUrl}/api/polls/${pollId}/ideas`)

  console.log('\nTip: Compare DevTools Network — disable cache, throttle Fast 3G,')
  console.log('count requests until the grid is interactive.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
