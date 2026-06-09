import type { PollIdea } from '@/components/PollIdeasBoard'
import type { Poll, PollResponse, PollRsvp } from '@/types/database'

export type PlanPagePoll = Pick<
  Poll,
  | 'id'
  | 'title'
  | 'creator_name'
  | 'date_options'
  | 'status'
  | 'scheduled_at'
  | 'scheduled_end_at'
  | 'scheduled_slot_key'
>

export type PlanPageResponse = Pick<PollResponse, 'id' | 'respondent_name' | 'availability'>

export type PlanPageRsvp = Pick<PollRsvp, 'respondent_name' | 'status'>

export type PlanPageInitialData = {
  poll: PlanPagePoll
  responses: PlanPageResponse[]
  aggregate: Record<string, number>
  rsvps: PlanPageRsvp[]
  scheduled_idea: { id: string; title: string; location: string | null } | null
  plan_identity: string | null
  is_creator: boolean
  ideas: PollIdea[]
}
