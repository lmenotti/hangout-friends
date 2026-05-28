import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: poll, error } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

  const [{ data: responses }, { data: rsvps }] = await Promise.all([
    supabase.from('poll_responses').select('*').eq('poll_id', id).order('created_at'),
    supabase.from('poll_rsvps').select('*').eq('poll_id', id).order('updated_at'),
  ])

  let scheduled_idea: { id: string; title: string; location: string | null } | null = null
  if (poll.scheduled_idea_id) {
    const { data: idea } = await supabase
      .from('ideas')
      .select('id, title, location')
      .eq('id', poll.scheduled_idea_id)
      .single()
    scheduled_idea = idea
  }

  const aggregate: Record<string, number> = {}
  for (const r of responses ?? []) {
    for (const [slot, free] of Object.entries(r.availability ?? {})) {
      if (free) aggregate[slot] = (aggregate[slot] ?? 0) + 1
    }
  }

  return NextResponse.json({
    poll,
    responses: responses ?? [],
    aggregate,
    rsvps: rsvps ?? [],
    scheduled_idea,
  })
}
