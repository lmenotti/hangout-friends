import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id')
    .eq('id', pollId)
    .single()

  if (pollError || !poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('id, title, description, location, duration_minutes, is_outdoor, created_by_name, created_at')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ideaIds = (ideas ?? []).map(i => i.id)
  const { data: votes } = ideaIds.length
    ? await supabase.from('poll_idea_votes').select('idea_id, respondent_name').in('idea_id', ideaIds)
    : { data: [] }

  const result = (ideas ?? []).map(idea => {
    const ideaVotes = (votes ?? []).filter(v => v.idea_id === idea.id)
    return {
      ...idea,
      vote_count: ideaVotes.length,
      voter_names: ideaVotes.map(v => v.respondent_name),
    }
  }).sort((a, b) => b.vote_count - a.vote_count)

  return NextResponse.json(result)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params
  const { title, description, location, duration_minutes, is_outdoor, created_by_name } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!created_by_name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data: poll } = await supabase.from('polls').select('id, status').eq('id', pollId).single()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.status === 'scheduled') {
    return NextResponse.json({ error: 'This plan is already scheduled.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ideas')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      duration_minutes: duration_minutes ?? null,
      is_outdoor: is_outdoor ?? false,
      poll_id: pollId,
      created_by_name: created_by_name.trim(),
      created_by: null,
    })
    .select('id, title, description, location, duration_minutes, is_outdoor, created_by_name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, vote_count: 0, voter_names: [] })
}
