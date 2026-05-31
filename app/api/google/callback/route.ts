import { NextRequest, NextResponse } from 'next/server'
import {
  decodeOAuthState,
  exchangeCodeForTokens,
  isGoogleOAuthConfigured,
  maybeUpgradeDisplayNameFromGoogle,
  saveGoogleTokens,
  watchCalendar,
} from '@/lib/googleCalendar'

export async function GET(req: NextRequest) {
  const profileUrl = new URL('/profile', req.nextUrl.origin)

  if (!isGoogleOAuthConfigured()) {
    profileUrl.searchParams.set('calendar', 'unavailable')
    return NextResponse.redirect(profileUrl)
  }

  const error = req.nextUrl.searchParams.get('error')
  if (error) {
    profileUrl.searchParams.set('calendar', 'denied')
    return NextResponse.redirect(profileUrl)
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (!code || !state) {
    profileUrl.searchParams.set('calendar', 'error')
    return NextResponse.redirect(profileUrl)
  }

  const userId = decodeOAuthState(state)
  if (!userId) {
    profileUrl.searchParams.set('calendar', 'error')
    return NextResponse.redirect(profileUrl)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    await saveGoogleTokens(userId, tokens)

    // Best-effort: register a push-notification channel so calendar changes invalidate the
    // busy cache automatically. Failure here does not block the connect flow.
    watchCalendar(userId).catch((err) =>
      console.error('watchCalendar failed after OAuth connect:', err),
    )

    await maybeUpgradeDisplayNameFromGoogle(userId, tokens.access_token)
    profileUrl.searchParams.set('calendar', 'connected')
    return NextResponse.redirect(profileUrl)
  } catch (err) {
    console.error('Google OAuth callback failed:', err)
    profileUrl.searchParams.set('calendar', 'error')
    return NextResponse.redirect(profileUrl)
  }
}
