import { NextRequest, NextResponse } from 'next/server'
import {
  getPlanIdentityFromCookies,
} from '@/lib/planIdentity'
import type { PlanWatch } from '@/lib/pushNotifications'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const PREFIX = 'hangout_plan_'

function pollIdsFromRequest(req: NextRequest): string[] {
  const ids: string[] = []
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith(PREFIX)) {
      ids.push(cookie.name.slice(PREFIX.length))
    }
  }
  return ids
}

export async function GET(req: NextRequest) {
  const pollIds = pollIdsFromRequest(req)
  if (!pollIds.length) {
    return NextResponse.json({ watches: [] as PlanWatch[] })
  }

  const watches: PlanWatch[] = []

  for (const pollId of pollIds) {
    const name = getPlanIdentityFromCookies(req.cookies, pollId)
    if (!name) continue

    const { data: poll } = await supabase
      .from('polls')
      .select('id, creator_name')
      .eq('id', pollId)
      .maybeSingle()

    if (!poll) continue

    const first = name.trim().split(/\s+/)[0] ?? ''
    const creatorFirst = (poll.creator_name ?? '').trim().split(/\s+/)[0] ?? ''

    if (first && creatorFirst && first.toLowerCase() === creatorFirst.toLowerCase()) {
      watches.push({ poll_id: pollId, role: 'creator' })
    }

    const { data: rsvp } = await supabase
      .from('poll_rsvps')
      .select('status')
      .eq('poll_id', pollId)
      .eq('respondent_name', name)
      .maybeSingle()

    if (rsvp?.status === 'yes') {
      watches.push({ poll_id: pollId, role: 'rsvp', respondent_name: first })
    }
  }

  return NextResponse.json({ watches })
}
