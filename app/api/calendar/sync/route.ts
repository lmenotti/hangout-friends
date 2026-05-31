import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import {
  clearGoogleTokens,
  isGoogleCalendarConnected,
  isGoogleOAuthConfigured,
  listBusyTimesCached,
  stopCalendarWatch,
} from '@/lib/googleCalendar'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connected = await isGoogleCalendarConnected(user.id)
  const timeMin = req.nextUrl.searchParams.get('timeMin')
  const timeMax = req.nextUrl.searchParams.get('timeMax')

  if (!timeMin || !timeMax) {
    return NextResponse.json({ connected })
  }

  if (!connected) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: 'Google Calendar OAuth is not available in this environment' }, { status: 404 })
  }

  try {
    const busy = await listBusyTimesCached(user.id, timeMin, timeMax)
    return NextResponse.json({ connected: true, busy })
  } catch (err) {
    console.error('Calendar sync failed:', err)
    return NextResponse.json({ error: 'Failed to fetch calendar busy times' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Stop watch before clearing tokens — channels.stop needs valid credentials.
    await stopCalendarWatch(user.id)
    await clearGoogleTokens(user.id)
    return NextResponse.json({ connected: false })
  } catch (err) {
    console.error('Calendar disconnect failed:', err)
    return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 })
  }
}
