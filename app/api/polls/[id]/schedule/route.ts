import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { findBestPollSchedule, formatScheduledLabel } from '@/lib/pollSchedule'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .single()

  if (pollError || !poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.status === 'scheduled') {
    return NextResponse.json({ error: 'This plan is already scheduled.' }, { status: 400 })
  }

  const dateOptions = (poll.date_options ?? []) as string[]
  if (dateOptions.length === 0) {
    return NextResponse.json({ error: 'No dates on this plan.' }, { status: 400 })
  }

  const [{ data: responses }, { data: ideas }] = await Promise.all([
    supabase.from('poll_responses').select('respondent_name, availability').eq('poll_id', pollId),
    supabase.from('ideas').select('id, title, location, is_outdoor, duration_minutes').eq('poll_id', pollId),
  ])

  if (!responses?.length) {
    return NextResponse.json({ error: 'No availability responses yet.' }, { status: 400 })
  }

  const ideaIds = (ideas ?? []).map(i => i.id)
  const { data: votes } = ideaIds.length
    ? await supabase.from('poll_idea_votes').select('idea_id, respondent_name').in('idea_id', ideaIds)
    : { data: [] }

  const ideasWithVoters = (ideas ?? []).map(idea => ({
    ...idea,
    voter_names: (votes ?? []).filter(v => v.idea_id === idea.id).map(v => v.respondent_name),
  }))

  const best = await findBestPollSchedule({
    dateOptions,
    responses: responses ?? [],
    ideas: ideasWithVoters,
  })

  if (!best) {
    return NextResponse.json({
      error: 'No slot found where an idea with 2+ votes and all its voters are free.',
    }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('polls')
    .update({
      status: 'scheduled',
      scheduled_at: best.scheduledAt.toISOString(),
      scheduled_end_at: best.scheduledEndAt?.toISOString() ?? null,
      scheduled_idea_id: best.ideaId,
      scheduled_slot_key: best.slotKey,
    })
    .eq('id', pollId)
    .select('*')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await supabase.from('ideas').update({ is_scheduled: true }).eq('id', best.ideaId)

  return NextResponse.json({
    poll: updated,
    message: `Scheduled "${best.ideaTitle}" for ${formatScheduledLabel(best.scheduledAt)} — ${best.totalAvailable} people free.`,
  })
}
