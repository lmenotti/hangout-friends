import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

/** Load ../.env.local into process.env (does not overwrite existing vars). */
export function loadEnvLocal(fromDir = dirname(fileURLToPath(import.meta.url))) {
  const envFile = resolve(fromDir, '../.env.local')
  if (!existsSync(envFile)) return

  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    process.env[key] ??= value
  }
}

/** Strip quotes/whitespace from an env value (Vercel pull often wraps in quotes). */
export function envValue(name) {
  const raw = process.env[name]
  if (raw == null) return undefined
  return raw.trim().replace(/^["']|["']$/g, '')
}
