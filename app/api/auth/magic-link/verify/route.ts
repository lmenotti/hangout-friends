import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { sanitizeReturnTo } from '@/lib/magicLink'

function sanitizeUserResponse(data: {
  id: string
  name: string
  token: string
  created_at: string
  home_location: string | null
  email?: string | null
  google_refresh_token?: string | null
}) {
  const { google_refresh_token, ...user } = data
  return {
    ...user,
    google_calendar_connected: !!google_refresh_token,
  }
}

export async function POST(req: NextRequest) {
  const { token: magicToken } = await req.json()
  if (!magicToken || typeof magicToken !== 'string') {
    return NextResponse.json({ error: 'Invalid link.' }, { status: 400 })
  }

  const { data: linkRow, error: linkError } = await supabase
    .from('magic_link_tokens')
    .select('*')
    .eq('token', magicToken)
    .is('used_at', null)
    .maybeSingle()

  if (linkError || !linkRow) {
    return NextResponse.json({ error: 'This sign-in link is invalid or already used.' }, { status: 400 })
  }

  if (new Date(linkRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This sign-in link has expired. Request a new one.' }, { status: 400 })
  }

  const email = linkRow.email.toLowerCase()
  const sessionToken = randomUUID()
  let userRecord: {
    id: string
    name: string
    token: string
    created_at: string
    home_location: string | null
    email: string | null
    google_refresh_token?: string | null
  } | null = null

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, name, token, created_at, home_location, email, google_refresh_token')
    .ilike('email', email)
    .maybeSingle()

  if (existingUser) {
    const { data, error } = await supabase
      .from('users')
      .update({ token: sessionToken })
      .eq('id', existingUser.id)
      .select('id, name, token, created_at, home_location, email, google_refresh_token')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Could not sign in.' }, { status: 500 })
    }
    userRecord = data
  } else {
    const signupName = linkRow.name?.trim()
    if (!signupName) {
      return NextResponse.json({ error: 'This sign-in link is for a new account but has no name.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .insert({ name: signupName, email, token: sessionToken })
      .select('id, name, token, created_at, home_location, email, google_refresh_token')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Could not create account.' }, { status: 500 })
    }
    userRecord = data
  }

  await supabase
    .from('magic_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', linkRow.id)

  return NextResponse.json({
    ...sanitizeUserResponse(userRecord),
    returnTo: sanitizeReturnTo(linkRow.return_to),
  })
}
