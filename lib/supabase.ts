import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): SupabaseClient<any> {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase environment variables')
    _client = createClient(url, key)
  }
  return _client
}

// Convenience alias (anon key — public read only, for client-side or public Server Components)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})

// ---------------------------------------------------------------------------
// Service-role client — bypasses RLS, server-side only.
// Use this in all API routes and server utilities that need to read or write
// data. Never import this in Client Components or expose it to the browser.
// ---------------------------------------------------------------------------

let _adminClient: SupabaseClient | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any> {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY // non-public — never prefix with NEXT_PUBLIC_
    if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    _adminClient = createClient(url, key, {
      auth: { persistSession: false },
    })
  }
  return _adminClient
}

// Convenience alias (service role — bypasses RLS, server-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: SupabaseClient<any> = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})
