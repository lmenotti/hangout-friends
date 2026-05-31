import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { watchCalendar } from '@/lib/googleCalendar'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Renew any channel expiring within the next 24 hours.
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: expiring, error } = await supabase
    .from('google_calendar_channels')
    .select('user_id')
    .lt('expires_at', threshold)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expiring?.length) {
    return NextResponse.json({ ok: true, renewed: 0 })
  }

  let renewed = 0
  const errors: string[] = []

  for (const { user_id } of expiring) {
    try {
      await watchCalendar(user_id)
      renewed++
    } catch (err) {
      errors.push(`${user_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, renewed, errors })
}
