import { cache } from 'react'
import { cookies } from 'next/headers'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getPlanIdentityFromCookies } from '@/lib/planIdentity'
import { isCreatorByCookie } from '@/lib/planCreator'
import type { PollIdea } from '@/components/PollIdeasBoard'
import type {
  PlanPageInitialData,
  PlanPageResponse,
  PlanPageRsvp,
} from '@/lib/planPageTypes'
import type { Poll } from '@/types/database'

export type { PlanPageInitialData, PlanPagePoll, PlanPageResponse, PlanPageRsvp } from '@/lib/planPageTypes'

export type PollSlugRow = Pick<
  Poll,
  | 'id'
  | 'title'
  | 'creator_name'
  | 'status'
  | 'scheduled_at'
  | 'scheduled_end_at'
  | 'expires_at'
  | 'archived_at'
  | 'scheduled_idea_id'
  | 'creator_token'
  | 'date_options'
  | 'scheduled_slot_key'
>

function computeAggregate(responses: PlanPageResponse[]): Record<string, number> {
  const aggregate: Record<string, number> = {}
  for (const r of responses) {
    for (const [slot, free] of Object.entries(r.availability ?? {})) {
      if (free) aggregate[slot] = (aggregate[slot] ?? 0) + 1
    }
  }
  return aggregate
}

async function fetchPollIdeas(pollId: string): Promise<PollIdea[]> {
  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('id, title, description, location, duration_minutes, is_outdoor, created_by_name, created_at')
    .eq('poll_id', pollId)
    .order('created_at', { ascending: false })

  if (error || !ideas?.length) return []

  const ideaIds = ideas.map((i) => i.id)
  const { data: votes } = await supabase
    .from('poll_idea_votes')
    .select('idea_id, respondent_name')
    .in('idea_id', ideaIds)

  return ideas
    .map((idea) => {
      const ideaVotes = (votes ?? []).filter((v) => v.idea_id === idea.id)
      return {
        ...idea,
        vote_count: ideaVotes.length,
        voter_names: ideaVotes.map((v) => v.respondent_name),
      }
    })
    .sort((a, b) => b.vote_count - a.vote_count)
}

/** Deduped per-request slug lookup (metadata + page). */
export const getPollBySlug = cache(async (slug: string): Promise<PollSlugRow | null> => {
  const { data, error } = await supabase
    .from('polls')
    .select(
      'id, title, creator_name, status, scheduled_at, scheduled_end_at, expires_at, archived_at, scheduled_idea_id, creator_token, date_options, scheduled_slot_key',
    )
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as PollSlugRow
})

/** Server payload for PollPageClient — same shape as GET /api/polls/[id] + ideas. */
export async function loadPlanPageInitialData(poll: PollSlugRow): Promise<PlanPageInitialData> {
  const cookieStore = await cookies()
  const planIdentity = getPlanIdentityFromCookies(cookieStore, poll.id)

  const [{ data: responses }, { data: rsvps }, ideas] = await Promise.all([
    supabase.from('poll_responses').select('*').eq('poll_id', poll.id).order('created_at'),
    supabase.from('poll_rsvps').select('*').eq('poll_id', poll.id).order('updated_at'),
    fetchPollIdeas(poll.id),
  ])

  let scheduled_idea: PlanPageInitialData['scheduled_idea'] = null
  if (poll.scheduled_idea_id) {
    const { data: idea } = await supabase
      .from('ideas')
      .select('id, title, location')
      .eq('id', poll.scheduled_idea_id)
      .single()
    scheduled_idea = idea
  }

  const responseRows = (responses ?? []) as PlanPageResponse[]
  const rsvpRows = (rsvps ?? []).map((r) => ({
    respondent_name: r.respondent_name,
    status: r.status as PlanPageRsvp['status'],
  }))

  return {
    poll: {
      id: poll.id,
      title: poll.title,
      creator_name: poll.creator_name,
      date_options: poll.date_options ?? [],
      status: poll.status,
      scheduled_at: poll.scheduled_at,
      scheduled_end_at: poll.scheduled_end_at,
      scheduled_slot_key: poll.scheduled_slot_key,
    },
    responses: responseRows,
    aggregate: computeAggregate(responseRows),
    rsvps: rsvpRows,
    scheduled_idea,
    plan_identity: planIdentity,
    is_creator: isCreatorByCookie(cookieStore, poll.id, poll.creator_token),
    ideas,
  }
}
