import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = (process.env.ADMIN_PIN ?? '1234').trim()

function checkPin(req: NextRequest) {
  return (req.headers.get('x-admin-pin') ?? '').trim() === ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('approved_names').select('id, name, created_at').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await supabase
    .from('approved_names')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await supabase.from('approved_names').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
