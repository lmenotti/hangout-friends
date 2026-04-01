import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json()
  if (!['yes', 'maybe', 'no'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('rsvps')
    .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: 'event_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}
