#!/usr/bin/env node
/**
 * Verify migration 021_poll_ideas_schedule.sql was applied.
 *
 * Auth (first match wins):
 *   1. SUPABASE_DB_URL — direct Postgres (most reliable)
 *   2. SUPABASE_ACCESS_TOKEN — Supabase Management API
 *   3. SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL — probe tables via API
 *
 * Usage: npm run verify:021
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal, envValue } from './loadEnvLocal.mjs'

loadEnvLocal()

const PROJECT_REF = envValue('SUPABASE_PROJECT_REF') || 'guzwglkxoyunnsraddhu'
const ACCESS_TOKEN = envValue('SUPABASE_ACCESS_TOKEN')?.replace(/[^\x20-\x7E]/g, '')
const DB_URL = envValue('SUPABASE_DB_URL')
const SUPABASE_URL = envValue('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = envValue('SUPABASE_SERVICE_ROLE_KEY')

function authHelp() {
  console.log('')
  console.log('Could not authenticate to Supabase. Add ONE of these to .env.local:')
  console.log('')
  console.log('  Option A (recommended for migrate + verify):')
  console.log('    SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...')
  console.log('    → Supabase Dashboard → Project Settings → Database → Connection string → URI')
  console.log('')
  console.log('  Option B (Management API — personal token, NOT the service role key):')
  console.log('    SUPABASE_ACCESS_TOKEN=sbp_...')
  console.log('    → https://supabase.com/dashboard/account/tokens → Generate new token')
  console.log('    If you see "JWT could not be decoded", the token is expired or wrong.')
  console.log('')
  console.log('  Option C (verify only, if app keys are already set):')
  console.log('    NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
}

async function querySql(sql) {
  if (DB_URL) {
    const { default: pkg } = await import('pg')
    const client = new pkg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
    await client.connect()
    try {
      return (await client.query(sql)).rows
    } finally {
      await client.end()
    }
  }

  if (!ACCESS_TOKEN) throw new Error('No SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN')

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (res.status === 401) {
    throw new Error(
      'Management API 401: JWT could not be decoded — SUPABASE_ACCESS_TOKEN is invalid or expired. ' +
      'Generate a new personal access token at supabase.com/dashboard/account/tokens (starts with sbp_), ' +
      'or use SUPABASE_DB_URL instead.'
    )
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`)
  const result = JSON.parse(text)
  return Array.isArray(result) ? result : []
}

async function verifyViaSql() {
  const checks = [
    {
      name: '_migrations row for 021',
      sql: `select filename from public._migrations where filename = '021_poll_ideas_schedule.sql'`,
      pass: rows => rows.length === 1,
    },
    {
      name: 'polls.status column',
      sql: `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'polls' and column_name = 'status'`,
      pass: rows => rows.length === 1,
    },
    {
      name: 'ideas.poll_id column',
      sql: `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'ideas' and column_name = 'poll_id'`,
      pass: rows => rows.length === 1,
    },
    {
      name: 'poll_idea_votes table',
      sql: `select table_name from information_schema.tables where table_schema = 'public' and table_name = 'poll_idea_votes'`,
      pass: rows => rows.length === 1,
    },
    {
      name: 'poll_rsvps table',
      sql: `select table_name from information_schema.tables where table_schema = 'public' and table_name = 'poll_rsvps'`,
      pass: rows => rows.length === 1,
    },
  ]

  const results = []
  for (const check of checks) {
    const rows = await querySql(check.sql)
    results.push({ name: check.name, ok: check.pass(rows) })
  }
  return results
}

async function verifyViaServiceRole() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  async function tableOk(table, select = '*') {
    const { error } = await db.from(table).select(select).limit(0)
    if (!error) return true
    const msg = error.message.toLowerCase()
    if (msg.includes('does not exist') || msg.includes('could not find')) return false
    throw new Error(`${table}: ${error.message}`)
  }

  async function columnOk(table, column) {
    const { error } = await db.from(table).select(column).limit(0)
    if (!error) return true
    const msg = error.message.toLowerCase()
    if (msg.includes('does not exist') || msg.includes('could not find')) return false
    throw new Error(`${table}.${column}: ${error.message}`)
  }

  const { data: migRow } = await db
    .from('_migrations')
    .select('filename')
    .eq('filename', '021_poll_ideas_schedule.sql')
    .maybeSingle()

  return [
    { name: '_migrations row for 021', ok: Boolean(migRow) },
    { name: 'polls.status column', ok: await columnOk('polls', 'status') },
    { name: 'ideas.poll_id column', ok: await columnOk('ideas', 'poll_id') },
    { name: 'poll_idea_votes table', ok: await tableOk('poll_idea_votes') },
    { name: 'poll_rsvps table', ok: await tableOk('poll_rsvps') },
  ]
}

async function main() {
  console.log('Checking migration 021…\n')

  let results
  let method

  if (DB_URL) {
    method = 'Postgres (SUPABASE_DB_URL)'
    results = await verifyViaSql()
  } else if (ACCESS_TOKEN) {
    method = 'Management API (SUPABASE_ACCESS_TOKEN)'
    try {
      results = await verifyViaSql()
    } catch (err) {
      if (SUPABASE_URL && SERVICE_KEY && String(err.message).includes('401')) {
        console.log(`⚠ ${err.message}\n`)
        console.log('Falling back to service-role probe…\n')
        method = 'Service role (SUPABASE_SERVICE_ROLE_KEY)'
        results = await verifyViaServiceRole()
      } else {
        throw err
      }
    }
  } else if (SUPABASE_URL && SERVICE_KEY) {
    method = 'Service role (SUPABASE_SERVICE_ROLE_KEY)'
    results = await verifyViaServiceRole()
  } else {
    authHelp()
    process.exit(1)
  }

  console.log(`Using: ${method}\n`)

  let allOk = true
  for (const { name, ok } of results) {
    console.log(`${ok ? '✓' : '✗'} ${name}`)
    if (!ok) allOk = false
  }

  console.log('')
  if (allOk) {
    console.log('Migration 021 looks good.')
    return
  }

  console.log('Migration 021 is NOT applied yet. Next steps:')
  console.log('  1. Fix auth if needed (see options above)')
  console.log('  2. Run: npm run migrate')
  console.log('  3. Re-run: npm run verify:021')
  console.log('')
  console.log('Or paste migrations/021_poll_ideas_schedule.sql into Supabase SQL Editor and run it,')
  console.log("then: insert into public._migrations (filename) values ('021_poll_ideas_schedule.sql');")
  process.exit(1)
}

main().catch(err => {
  console.error('\n' + err.message)
  if (String(err.message).includes('401') || String(err.message).includes('JWT')) authHelp()
  process.exit(1)
})
