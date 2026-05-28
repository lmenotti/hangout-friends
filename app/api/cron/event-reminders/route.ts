import { NextRequest, NextResponse } from 'next/server'
import { sendEventRemindersForTomorrow } from '@/lib/pushNotifications'

/**
 * Daily cron: push reminders for plans RSVP'd "yes" that happen tomorrow.
 *
 * Required env: CRON_SECRET — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
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

  const result = await sendEventRemindersForTomorrow()
  return NextResponse.json({
    ok: true,
    ...result,
    ran_at: new Date().toISOString(),
  })
}
