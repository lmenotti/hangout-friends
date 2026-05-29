import { NextRequest, NextResponse } from 'next/server'
import { notifyPlanCreatorScheduled } from '@/lib/pushNotifications'
import {
  findTopPollScheduleCandidates,
  formatScheduledLabel,
  type RankedScheduleCandidate,
} from '@/lib/pollSchedule'
import { supabaseAdmin as supabase } from '@/lib/supabase'

function serializeCandidate(c: RankedScheduleCandidate) {
  return {
    rank: c.rank,
    idea_id: c.ideaId,
    idea_title: c.ideaTitle,
    slot_key: c.slotKey,
    scheduled_at: c.scheduledAt.toISOString(),
    scheduled_end_at: c.scheduledEndAt?.toISOString() ?? null,
    voter_count: c.voterCount,
    total_available: c.totalAvailable,
    weather_score: c.weatherScore,
    reason: c.reason,
  }
}

async function loadScheduleContext(pollId: string) {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .single()

  if (pollError || !poll) return { error: NextResponse.json({ error: 'Poll not found' }, { status: 404 }) }
  if (poll.status === 'scheduled') {
    return { error: NextResponse.json({ error: 'This plan is already scheduled.' }, { status: 400 }) }
  }

  const dateOptions = (poll.date_options ?? []) as string[]
  if (dateOptions.length === 0) {
    return { error: NextResponse.json({ error: 'No dates on this plan.' }, { status: 400 }) }
  }

  const [{ data: responses }, { data: ideas }] = await Promise.all([
    supabase.from('poll_responses').select('respondent_name, availability').eq('poll_id', pollId),
    supabase.from('ideas').select('id, title, location, is_outdoor, duration_minutes').eq('poll_id', pollId),
  ])

  if (!responses?.length) {
    return { error: NextResponse.json({ error: 'No availability responses yet.' }, { status: 400 }) }
  }

  const ideaIds = (ideas ?? []).map(i => i.id)
  const { data: votes } = ideaIds.length
    ? await supabase.from('poll_idea_votes').select('idea_id, respondent_name').in('idea_id', ideaIds)
    : { data: [] }

  const ideasWithVoters = (ideas ?? []).map(idea => ({
    ...idea,
    voter_names: (votes ?? []).filter(v => v.idea_id === idea.id).map(v => v.respondent_name),
  }))

  return { poll, dateOptions, responses, ideasWithVoters }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params

  let slotKey: string | undefined
  let ideaId: string | undefined
  try {
    const text = await req.text()
    if (text.trim()) {
      const body = JSON.parse(text) as { slot_key?: string; idea_id?: string }
      slotKey = body.slot_key?.trim() || undefined
      ideaId = body.idea_id?.trim() || undefined
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ctx = await loadScheduleContext(pollId)
  if ('error' in ctx && ctx.error) return ctx.error
  const { poll, dateOptions, responses, ideasWithVoters } = ctx

  const candidates = await findTopPollScheduleCandidates({
    dateOptions,
    responses: responses ?? [],
    ideas: ideasWithVoters,
  })

  if (candidates.length === 0) {
    return NextResponse.json({
      error: 'No slot found where an idea with 2+ votes and all its voters are free.',
    }, { status: 400 })
  }

  if (!slotKey && !ideaId) {
    return NextResponse.json({ candidates: candidates.map(serializeCandidate) })
  }

  if (!slotKey || !ideaId) {
    return NextResponse.json({ error: 'Both slot_key and idea_id are required to confirm a schedule.' }, { status: 400 })
  }

  const chosen = candidates.find(c => c.slotKey === slotKey && c.ideaId === ideaId)
  if (!chosen) {
    return NextResponse.json({ error: 'That time and activity is not a valid schedule option.' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('polls')
    .update({
      status: 'scheduled',
      scheduled_at: chosen.scheduledAt.toISOString(),
      scheduled_end_at: chosen.scheduledEndAt?.toISOString() ?? null,
      scheduled_idea_id: chosen.ideaId,
      scheduled_slot_key: chosen.slotKey,
    })
    .eq('id', pollId)
    .select('*')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await supabase.from('ideas').update({ is_scheduled: true }).eq('id', chosen.ideaId)

  void notifyPlanCreatorScheduled(pollId)

  return NextResponse.json({
    poll: updated,
    message: `Scheduled "${chosen.ideaTitle}" for ${formatScheduledLabel(chosen.scheduledAt)} — ${chosen.totalAvailable} people free.`,
  })
}
