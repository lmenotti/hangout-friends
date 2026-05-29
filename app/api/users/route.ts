import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

function sanitizeUserResponse(
  data: { id: string; name: string; token: string; created_at: string; home_location: string | null; email?: string | null; google_refresh_token?: string | null }
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
    .select('id, name, token, created_at, home_location, email, google_refresh_token')
    .eq('token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(sanitizeUserResponse(data))
}
