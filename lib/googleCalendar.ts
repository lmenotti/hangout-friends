import { createHmac } from 'crypto'
import { google } from 'googleapis'
import type { Credentials } from 'google-auth-library'
import {
  canUpgradeNameFromGoogle,
  normalizeGoogleGivenName,
  type DisplayNameSource,
} from '@/lib/displayName'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
export const GOOGLE_PROFILE_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile'

export type BusyInterval = {
  start: string
  end: string
}

type BusyCacheEntry = {
  timeMin: string
  timeMax: string
  busy: BusyInterval[]
}

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

type GoogleTokenRow = {
  id: string
  google_access_token: string | null
  google_refresh_token: string | null
  google_scope: string | null
  google_token_type: string | null
  google_expiry_date: number | null
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function createOAuth2Client() {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth is not configured')
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/google/callback`,
  )
}

export function getAuthUrl(state: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_CALENDAR_SCOPE, GOOGLE_PROFILE_SCOPE, 'openid'],
    state,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function saveGoogleTokens(userId: string, tokens: Credentials): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      google_access_token: tokens.access_token ?? null,
      google_refresh_token: tokens.refresh_token ?? null,
      google_scope: tokens.scope ?? null,
      google_token_type: tokens.token_type ?? null,
      google_expiry_date: tokens.expiry_date ?? null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export async function fetchGoogleProfileGivenName(accessToken: string): Promise<string | null> {
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()
  return normalizeGoogleGivenName(data.given_name ?? data.name)
}

/** Upgrade display name from Google profile when the name came from email derivation. */
export async function maybeUpgradeDisplayNameFromGoogle(
  userId: string,
  accessToken: string | null | undefined,
): Promise<void> {
  if (!accessToken) return

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('name_source')
      .eq('id', userId)
      .single()

    if (error || !user) return
    if (!canUpgradeNameFromGoogle(user.name_source as DisplayNameSource | null)) return

    const googleName = await fetchGoogleProfileGivenName(accessToken)
    if (!googleName) return

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: googleName, name_source: 'google' })
      .eq('id', userId)

    if (updateError) {
      console.error('[googleCalendar] display name upgrade failed:', updateError.message)
    }
  } catch (err) {
    console.error('[googleCalendar] display name upgrade failed:', err)
  }
}

export async function clearGoogleTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_scope: null,
      google_token_type: null,
      google_expiry_date: null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return Boolean(data.google_refresh_token)
}

async function getUserGoogleTokens(userId: string): Promise<GoogleTokenRow> {
  const { data, error } = await supabase
    .from('users')
    .select('id, google_access_token, google_refresh_token, google_scope, google_token_type, google_expiry_date')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error('User not found')
  }

  if (!data.google_access_token && !data.google_refresh_token) {
    throw new Error('Google Calendar not connected')
  }

  return data
}

async function getAuthenticatedCalendarClient(userId: string) {
  const user = await getUserGoogleTokens(userId)
  const client = createOAuth2Client()

  client.setCredentials({
    access_token: user.google_access_token ?? undefined,
    refresh_token: user.google_refresh_token ?? undefined,
    scope: user.google_scope ?? undefined,
    token_type: user.google_token_type ?? undefined,
    expiry_date: user.google_expiry_date ?? undefined,
  })

  client.on('tokens', async (tokens) => {
    const update: {
      google_access_token?: string
      google_refresh_token?: string
      google_expiry_date?: number
    } = {}

    if (tokens.access_token) update.google_access_token = tokens.access_token
    if (tokens.expiry_date) update.google_expiry_date = tokens.expiry_date
    if (tokens.refresh_token) update.google_refresh_token = tokens.refresh_token

    if (Object.keys(update).length === 0) return

    await supabase.from('users').update(update).eq('id', userId)
  })

  return google.calendar({ version: 'v3', auth: client })
}

export async function listBusyTimes(
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyInterval[]> {
  const calendar = await getAuthenticatedCalendarClient(userId)

  const result = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: 'primary' }],
    },
  })

  const busy = result.data.calendars?.primary?.busy ?? []
  return busy
    .filter((block): block is { start: string; end: string } => Boolean(block.start && block.end))
    .map((block) => ({ start: block.start, end: block.end }))
}

function getStateSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? 'local-dev-state-secret'
}

export function encodeOAuthState(userId: string): string {
  const payload = JSON.stringify({ userId, ts: Date.now() })
  const sig = createHmac('sha256', getStateSecret()).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, sig })).toString('base64url')
}

export function decodeOAuthState(state: string): string | null {
  try {
    const { payload, sig } = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      payload: string
      sig: string
    }
    const expected = createHmac('sha256', getStateSecret()).update(payload).digest('hex')
    if (sig !== expected) return null

    const { userId, ts } = JSON.parse(payload) as { userId: string; ts: number }
    if (Date.now() - ts > 10 * 60 * 1000) return null

    return userId
  } catch {
    return null
  }
}

// Returns cached busy times if fresh and covering the requested range; otherwise fetches
// from Google, updates the cache, and returns the result.
export async function listBusyTimesCached(
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<BusyInterval[]> {
  const { data: user } = await supabase
    .from('users')
    .select('google_busy_cache, google_busy_cached_at')
    .eq('id', userId)
    .single()

  if (user?.google_busy_cached_at && user?.google_busy_cache) {
    const cachedAt = new Date(user.google_busy_cached_at as string).getTime()
    const cache = user.google_busy_cache as BusyCacheEntry
    const fresh = Date.now() - cachedAt < CACHE_TTL_MS
    const covers = cache.timeMin <= timeMin && cache.timeMax >= timeMax

    if (fresh && covers) {
      return cache.busy.filter((b) => b.start >= timeMin && b.end <= timeMax)
    }
  }

  const busy = await listBusyTimes(userId, timeMin, timeMax)

  await supabase
    .from('users')
    .update({
      google_busy_cache: { timeMin, timeMax, busy },
      google_busy_cached_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return busy
}

// Marks this user's busy cache as stale so the next plan page load re-fetches.
export async function invalidateBusyCache(userId: string): Promise<void> {
  await supabase.from('users').update({ google_busy_cached_at: null }).eq('id', userId)
}

// Registers a Google Calendar push-notification channel for the user.
// No-ops in non-HTTPS environments (local dev) because Google requires HTTPS addresses.
export async function watchCalendar(userId: string): Promise<void> {
  const base = getBaseUrl()
  if (!base.startsWith('https://')) return

  const channelId = crypto.randomUUID()
  // Set expiry to 6 days so the renewal cron (24h window) catches it before Google drops it.
  const expirationMs = Date.now() + 6 * 24 * 60 * 60 * 1000

  const calendarClient = await getAuthenticatedCalendarClient(userId)
  const res = await calendarClient.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: `${base}/api/google/webhook`,
      expiration: String(expirationMs),
    },
  })

  const resourceId = res.data.resourceId
  const expiration = res.data.expiration
  if (!resourceId || !expiration) throw new Error('Watch response missing resourceId or expiration')

  // Replace any existing channel for this user.
  await stopCalendarWatch(userId)

  await supabase.from('google_calendar_channels').insert({
    user_id: userId,
    channel_id: channelId,
    resource_id: resourceId,
    expires_at: new Date(Number(expiration)).toISOString(),
  })
}

// Stops the active push-notification channel for the user and deletes the DB record.
// Must be called before clearing Google tokens (needs valid credentials to call channels.stop).
export async function stopCalendarWatch(userId: string): Promise<void> {
  const { data } = await supabase
    .from('google_calendar_channels')
    .select('channel_id, resource_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return

  try {
    const calendarClient = await getAuthenticatedCalendarClient(userId)
    await calendarClient.channels.stop({
      requestBody: { id: data.channel_id, resourceId: data.resource_id },
    })
  } catch {
    // Google may have already expired the channel — safe to ignore and clean up locally.
  }

  await supabase
    .from('google_calendar_channels')
    .delete()
    .eq('user_id', userId)
}
