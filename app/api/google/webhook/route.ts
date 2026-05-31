import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { invalidateBusyCache } from '@/lib/googleCalendar'

export async function POST(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id')
  const resourceState = req.headers.get('x-goog-resource-state')

  // Google sends a 'sync' message when the watch is first registered — nothing to invalidate.
  if (resourceState === 'sync') {
    return new NextResponse(null, { status: 200 })
  }

  if (!channelId) {
    return new NextResponse(null, { status: 400 })
  }

  // Verify the channel exists in our DB — this is the implicit auth check.
  const { data } = await supabase
    .from('google_calendar_channels')
    .select('user_id')
    .eq('channel_id', channelId)
    .maybeSingle()

  if (!data) {
    return new NextResponse(null, { status: 404 })
  }

  await invalidateBusyCache(data.user_id)

  return new NextResponse(null, { status: 200 })
}
