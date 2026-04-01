import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { hashPassword, verifyPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const { name, password, home_location } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const trimmedName = name.trim()
  const trimmedPassword = password?.trim() ?? ''
  const trimmedHome = home_location?.trim() || null

  // Check if name is on the approved list
  const { data: approved } = await supabase
    .from('approved_names')
    .select('name')
    .ilike('name', trimmedName)
    .single()

  if (!approved) {
    return NextResponse.json({ error: 'Your name isn\'t on the list. Ask an admin to add you.' }, { status: 403 })
  }

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
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // First sign-in: create account
  const newToken = randomUUID()
  const password_hash = trimmedPassword ? hashPassword(trimmedPassword) : null

  const { data, error } = await supabase
    .from('users')
    .insert({ name: trimmedName, token: newToken, password_hash, home_location: trimmedHome })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select()
    .eq('token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(data)
}
