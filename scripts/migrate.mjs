#!/usr/bin/env node
/**
 * Migration runner — applies pending SQL files from /migrations to Supabase.
 * Tracks applied migrations in a public._migrations table.
 *
 * Requires ONE of these env vars:
 *
 *   SUPABASE_ACCESS_TOKEN  — Personal access token from:
 *                            supabase.com/dashboard/account/tokens
 *                            (also set SUPABASE_PROJECT_REF if not hardcoded below)
 *
 *   SUPABASE_DB_URL        — Direct postgres connection URI from:
 *                            Project Settings → Database → Connection string → URI
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env.local for local dev (Vercel injects env vars automatically in CI)
const envFile = resolve(__dir, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] ??= match[2].trim()
  }
}
const migrationsDir = resolve(__dir, '../migrations')

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'guzwglkxoyunnsraddhu'
// Strip any non-ASCII chars that can sneak in via terminal copy-paste
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.replace(/[^\x20-\x7E]/g, '').trim() || undefined
const DB_URL = process.env.SUPABASE_DB_URL?.trim() || undefined

if (!ACCESS_TOKEN && !DB_URL) {
  console.log('⚠  No SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL set — skipping migrations')
  process.exit(0)
}

async function runSqlViaApi(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase API error (${res.status}): ${text}`)
  }
  return res.json()
}

async function runSqlViaPg(sql) {
  const { default: pkg } = await import('pg')
  const { Client } = pkg
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

async function querySqlViaPg(sql) {
  const { default: pkg } = await import('pg')
  const { Client } = pkg
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const result = await client.query(sql)
    return result.rows
  } finally {
    await client.end()
  }
}

async function execSql(sql) {
  if (ACCESS_TOKEN) return runSqlViaApi(sql)
  return runSqlViaPg(sql)
}

async function queryRows(sql) {
  if (ACCESS_TOKEN) {
    const result = await runSqlViaApi(sql)
    // Management API returns array of rows directly
    return Array.isArray(result) ? result : []
  }
  return querySqlViaPg(sql)
}

async function run() {
  const method = ACCESS_TOKEN ? 'Supabase Management API' : 'direct Postgres'
  console.log(`Running migrations via ${method}…`)

  // Create tracking table
  await execSql(`
    create table if not exists public._migrations (
      filename text primary key,
      applied_at timestamptz default now() not null
    )
  `)

  const applied = await queryRows('select filename from public._migrations')
  const appliedSet = new Set(applied.map(r => r.filename))

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  let ranCount = 0
  for (const file of files) {
    if (appliedSet.has(file)) continue

    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
    console.log(`  → ${file}`)
    try {
      await execSql(sql)
      await execSql(`insert into public._migrations (filename) values ('${file.replace(/'/g, "''")}')`)
      ranCount++
    } catch (err) {
      console.error(`  ✗ failed on ${file}:`, err.message)
      process.exit(1)
    }
  }

  if (ranCount === 0) {
    console.log('  ✓ all migrations already applied')
  } else {
    console.log(`  ✓ applied ${ranCount} migration${ranCount !== 1 ? 's' : ''}`)
  }
}

run().catch(err => {
  console.error('Migration error:', err)
  process.exit(1)
})
