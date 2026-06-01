import { NextRequest, NextResponse } from 'next/server'
import { appendLastPlanSlugCookie } from '@/lib/lastPlan'
import { appendPlanIdentityCookie, normalizePlanIdentityName } from '@/lib/planIdentity'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const VALID = new Set(['yes', 'maybe', 'no'])

async function attachPlanCookies(res: NextResponse, pollId: string, name: string) {
  appendPlanIdentityCookie(res, pollId, name)
  const { data: poll } = await supabase.from('polls').select('slug').eq('id', pollId).single()
  if (poll?.slug) appendLastPlanSlugCookie(res, poll.slug)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params
  const { respondent_name, status } = await req.json()

  const name = normalizePlanIdentityName(respondent_name ?? '')
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  if (!VALID.has(status)) {
    return NextResponse.json({ error: 'Status must be yes, maybe, or no.' }, { status: 400 })
  }

  const { data: poll } = await supabase.from('polls').select('status').eq('id', pollId).single()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.status !== 'scheduled') {
    return NextResponse.json({ error: 'RSVP is only available after the plan is scheduled.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('poll_rsvps')
    .select('poll_id')
    .eq('poll_id', pollId)
    .eq('respondent_name', name)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('poll_rsvps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('poll_id', pollId)
      .eq('respondent_name', name)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const res = NextResponse.json(data)
    await attachPlanCookies(res, pollId, name)
    return res
  }

  const { data, error } = await supabase
    .from('poll_rsvps')
    .insert({ poll_id: pollId, respondent_name: name, status })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const res = NextResponse.json(data)
  await attachPlanCookies(res, pollId, name)
  return res
}
