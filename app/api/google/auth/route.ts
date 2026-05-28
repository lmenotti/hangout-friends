import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { encodeOAuthState, getAuthUrl, isGoogleOAuthConfigured } from '@/lib/googleCalendar'

async function getUserFromSession(req: NextRequest) {
  const token = req.headers.get('x-user-token') ?? req.cookies.get('gs_token')?.value
  if (!token) return null

  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: 'Google Calendar OAuth is not available in this environment' }, { status: 404 })
  }

  const user = await getUserFromSession(req)
  if (!user) {
    const profileUrl = new URL('/profile', req.nextUrl.origin)
    profileUrl.searchParams.set('calendar', 'sign-in-required')
    return NextResponse.redirect(profileUrl)
  }

  const state = encodeOAuthState(user.id)
  const authUrl = getAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
