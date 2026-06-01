import type { PollIdea } from '@/components/PollIdeasBoard'

export type PlanPagePoll = {
  id: string
  title: string
  creator_name: string
  date_options: string[]
  status: 'polling' | 'scheduled'
  scheduled_at: string | null
  scheduled_end_at: string | null
  scheduled_slot_key: string | null
}

export type PlanPageResponse = {
  id: string
  respondent_name: string
  availability: Record<string, boolean>
}

export type PlanPageRsvp = {
  respondent_name: string
  status: 'yes' | 'maybe' | 'no'
}

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
