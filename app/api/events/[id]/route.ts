import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('events').select('created_by').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.created_by !== null && existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, scheduled_at, end_time, location } = await req.json()

  const { error } = await supabase
    .from('events')
    .update({
      title: title?.trim() || undefined,
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      end_time: end_time || null,
      location: location?.trim() || null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = await supabase.from('events').select().eq('id', id).single()
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('events').select('created_by').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.created_by !== null && existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('rsvps').delete().eq('event_id', id)
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
