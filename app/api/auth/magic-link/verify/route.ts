import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { resolveDisplayNameForNewAccount } from '@/lib/displayName'
import { sanitizeReturnTo } from '@/lib/magicLink'
import { getAllPlanIdentityNamesFromRequest } from '@/lib/planIdentity'

/** Allow idempotent re-verify shortly after first use (React Strict Mode double-fetch). */
const RECENTLY_USED_MS = 5 * 60 * 1000

type UserRow = {
  id: string
  name: string
  token: string
  created_at: string
  home_location: string | null
  email: string | null
  google_refresh_token?: string | null
}

type LinkRow = {
  id: string
  email: string
  return_to: string | null
  expires_at: string
  used_at: string | null
}

function sanitizeUserResponse(data: UserRow) {
  const { google_refresh_token, ...user } = data
  return {
    ...user,
    google_calendar_connected: !!google_refresh_token,
  }
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '23505' || (error.message?.includes('users_email_lower_idx') ?? false)
}

function isRecentlyUsed(usedAt: string | null): boolean {
  if (!usedAt) return false
  return Date.now() - new Date(usedAt).getTime() <= RECENTLY_USED_MS
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, token, created_at, home_location, email, google_refresh_token')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[magic-link/verify] user lookup failed:', error.message)
    return null
  }
  return data
}

async function rotateSessionToken(userId: string, sessionToken: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ token: sessionToken })
    .eq('id', userId)
    .select('id, name, token, created_at, home_location, email, google_refresh_token')
    .single()

  if (error || !data) {
    console.error('[magic-link/verify] session update failed:', error?.message)
    return null
  }
  return data
}

async function createUser(
  email: string,
  sessionToken: string,
  planNames: string[],
): Promise<{ user: UserRow | null; duplicateEmail: boolean }> {
  const { name, source } = resolveDisplayNameForNewAccount(email, planNames)

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, token: sessionToken, name_source: source })
    .select('id, name, token, created_at, home_location, email, google_refresh_token')
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      return { user: null, duplicateEmail: true }
    }
    console.error('[magic-link/verify] create user failed:', error.message)
    return { user: null, duplicateEmail: false }
  }

  return { user: data, duplicateEmail: false }
}

async function signInOrCreateUser(req: NextRequest, email: string): Promise<UserRow | null> {
  const sessionToken = randomUUID()
  const normalizedEmail = email.toLowerCase()

  const existingUser = await findUserByEmail(normalizedEmail)
  if (existingUser) {
    return rotateSessionToken(existingUser.id, sessionToken)
  }

  const planNames = getAllPlanIdentityNamesFromRequest(req)
  const { user, duplicateEmail } = await createUser(normalizedEmail, sessionToken, planNames)

  if (user) return user

  if (duplicateEmail) {
    const racedUser = await findUserByEmail(normalizedEmail)
    if (!racedUser) return null
    return rotateSessionToken(racedUser.id, sessionToken)
  }

  return null
}

async function finishVerify(req: NextRequest, linkRow: LinkRow) {
  const userRecord = await signInOrCreateUser(req, linkRow.email)
  if (!userRecord) {
    return NextResponse.json({ error: 'Could not sign in.' }, { status: 500 })
  }

  return NextResponse.json({
    ...sanitizeUserResponse(userRecord),
    returnTo: sanitizeReturnTo(linkRow.return_to),
  })
}

export async function POST(req: NextRequest) {
  const { token: magicToken } = await req.json()
  if (!magicToken || typeof magicToken !== 'string') {
    return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
  }

  const { data: linkRow, error: linkError } = await supabase
    .from('magic_link_tokens')
    .select('id, email, return_to, expires_at, used_at')
    .eq('token', magicToken)
    .maybeSingle()

  if (linkError || !linkRow) {
    return NextResponse.json({ error: 'This sign-in link is invalid or already used.' }, { status: 400 })
  }

  if (new Date(linkRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This sign-in link has expired. Request a new one.' }, { status: 400 })
  }

  if (linkRow.used_at) {
    if (isRecentlyUsed(linkRow.used_at)) {
      return finishVerify(req, linkRow)
    }
    return NextResponse.json({ error: 'This sign-in link is invalid or already used.' }, { status: 400 })
  }

  const claimedAt = new Date().toISOString()
  const { data: claimedRow, error: claimError } = await supabase
    .from('magic_link_tokens')
    .update({ used_at: claimedAt })
    .eq('id', linkRow.id)
    .is('used_at', null)
    .select('id, email, return_to, expires_at, used_at')
    .maybeSingle()

  if (claimError) {
    return NextResponse.json({ error: 'Could not verify sign-in link.' }, { status: 500 })
  }

  if (!claimedRow) {
    const { data: refreshed } = await supabase
      .from('magic_link_tokens')
      .select('id, email, return_to, expires_at, used_at')
      .eq('id', linkRow.id)
      .maybeSingle()

    if (refreshed?.used_at && isRecentlyUsed(refreshed.used_at)) {
      return finishVerify(req, refreshed)
    }
    return NextResponse.json({ error: 'This sign-in link is invalid or already used.' }, { status: 400 })
  }

  return finishVerify(req, claimedRow)
}
