import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

function applyEnvFile(filePath, { overwrite = false } = {}) {
  if (!existsSync(filePath)) return

  for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (overwrite) process.env[key] = value
    else process.env[key] ??= value
  }
}

/**
 * Load local env files into process.env.
 * 1. `.env.local` — Vercel pull target; does not overwrite existing vars.
 * 2. `.env.secrets.local` — dev-only secrets (Linear, etc.); wins over `.env.local`.
 */
export function loadEnvLocal(fromDir = dirname(fileURLToPath(import.meta.url))) {
  const root = resolve(fromDir, '..')
  applyEnvFile(resolve(root, '.env.local'))
  applyEnvFile(resolve(root, '.env.secrets.local'), { overwrite: true })
}

/** Strip quotes/whitespace from an env value (Vercel pull often wraps in quotes). */
export function envValue(name) {
  const raw = process.env[name]
  if (raw == null) return undefined
  return raw.trim().replace(/^["']|["']$/g, '')
}
