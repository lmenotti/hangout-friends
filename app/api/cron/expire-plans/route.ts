import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

/**
 * Daily cron: archive plans past their expires_at timestamp.
 *
 * Required env: CRON_SECRET — set in Vercel project settings. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` on each invocation; manual calls must use
 * the same header.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('polls')
    .update({ archived_at: now })
    .lt('expires_at', now)
    .is('archived_at', null)
    .not('expires_at', 'is', null)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    archived_count: data?.length ?? 0,
    ran_at: now,
  })
}
