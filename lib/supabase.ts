import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

createClient<Database>(url, key)
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

// Convenience alias
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})
