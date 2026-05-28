import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { hashPassword, verifyPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const { name, password, home_location } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const trimmedName = name.trim()
  const trimmedPassword = password?.trim() ?? ''
  const trimmedHome = home_location?.trim() || null

  // Check if name already exists (returning user)
  const { data: existing } = await supabase
    .from('users')
    .select()
    .ilike('name', trimmedName)
    .single()

  if (existing) {
    if (existing.password_hash) {
      if (!trimmedPassword) {
        return NextResponse.json({ error: 'This account is password-protected. Enter your password.', needsPassword: true }, { status: 401 })
      }
      if (!verifyPassword(trimmedPassword, existing.password_hash)) {
        return NextResponse.json({ error: 'Wrong password.', needsPassword: true }, { status: 401 })
      }
    }
    const newToken = randomUUID()
    const { data, error } = await supabase
      .from('users')
      .update({ token: newToken })
      .eq('id', existing.id)
      .select('id, name, token, created_at, home_location, google_refresh_token')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(sanitizeUserResponse(data))
  }

  // First sign-in: create account
  const newToken = randomUUID()
  const password_hash = trimmedPassword ? hashPassword(trimmedPassword) : null

  const { data, error } = await supabase
    .from('users')
    .insert({ name: trimmedName, token: newToken, password_hash, home_location: trimmedHome })
    .select('id, name, token, created_at, home_location, google_refresh_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(sanitizeUserResponse(data))
}

function sanitizeUserResponse(
  data: { id: string; name: string; token: string; created_at: string; home_location: string | null; google_refresh_token?: string | null }
) {
  const { google_refresh_token, ...user } = data
  return {
    ...user,
    google_calendar_connected: !!google_refresh_token,
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { home_location } = await req.json()
  const trimmedHome = home_location?.trim() || null

  const { data, error } = await supabase
    .from('users')
    .update({ home_location: trimmedHome })
    .eq('token', token)
    .select('id, name, token, created_at, home_location, google_refresh_token')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 500 })
  return NextResponse.json(sanitizeUserResponse(data))
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('id, name, token, created_at, home_location, google_refresh_token')
    .eq('token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(sanitizeUserResponse(data))
}
