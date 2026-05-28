import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; ideaId: string }> }) {
  const { id: podId, ideaId } = await params
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduled_at, end_time, location, recurrence_rule, recurrence_end } = await req.json()
  if (!scheduled_at) return NextResponse.json({ error: 'scheduled_at required' }, { status: 400 })

  const { data: idea } = await supabase.from('ideas').select('*').eq('id', ideaId).single()
  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: idea.title,
      description: idea.description,
      scheduled_at,
      end_time: end_time || null,
      location: location?.trim() || idea.suggested_place || null,
      pod_id: podId,
      created_by: user.id,
      source_idea_id: ideaId,
      recurrence_rule: recurrence_rule || null,
      recurrence_end: recurrence_end || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ideas').update({ status: 'scheduled' }).eq('id', ideaId)

  return NextResponse.json(event)
}
