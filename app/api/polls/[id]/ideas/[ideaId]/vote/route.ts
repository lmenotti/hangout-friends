import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
  const { id: pollId, ideaId } = await params
  const { respondent_name } = await req.json()

  if (!respondent_name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const name = respondent_name.trim()

  const { data: idea } = await supabase
    .from('ideas')
    .select('id, poll_id')
    .eq('id', ideaId)
    .eq('poll_id', pollId)
    .single()

  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

  const { data: poll } = await supabase.from('polls').select('status').eq('id', pollId).single()
  if (poll?.status === 'scheduled') {
    return NextResponse.json({ error: 'This plan is already scheduled.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('poll_idea_votes')
    .select('idea_id')
    .eq('idea_id', ideaId)
    .eq('respondent_name', name)
    .maybeSingle()

  if (existing) {
    await supabase.from('poll_idea_votes').delete().eq('idea_id', ideaId).eq('respondent_name', name)
    return NextResponse.json({ voted: false })
  }

  const { error } = await supabase.from('poll_idea_votes').insert({ idea_id: ideaId, respondent_name: name })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ voted: true })
}
