import { NextRequest, NextResponse } from 'next/server'
import { isCreatorByRequest } from '@/lib/planCreator'
import { appendPlanIdentityCookie, normalizePlanIdentityName } from '@/lib/planIdentity'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await params
  const { name: rawName } = await req.json()
  const newName = normalizePlanIdentityName(rawName ?? '')
  if (!newName) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, creator_name, creator_token')
    .eq('id', pollId)
    .single()

  if (pollError || !poll) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (!isCreatorByRequest(req, pollId, poll.creator_token)) {
    return NextResponse.json({ error: 'Only the plan creator can change this name.' }, { status: 403 })
  }

  const oldName = poll.creator_name?.trim() ?? ''
  if (oldName.toLowerCase() === newName.toLowerCase()) {
    return NextResponse.json({ creator_name: newName })
  }

  const { error: updatePollError } = await supabase
    .from('polls')
    .update({ creator_name: newName })
    .eq('id', pollId)

  if (updatePollError) {
    return NextResponse.json({ error: updatePollError.message }, { status: 500 })
  }

  if (oldName) {
    const { data: responses } = await supabase
      .from('poll_responses')
      .select('id, respondent_name')
      .eq('poll_id', pollId)

    for (const row of responses ?? []) {
      if (row.respondent_name.toLowerCase() !== oldName.toLowerCase()) continue
      await supabase
        .from('poll_responses')
        .update({ respondent_name: newName })
        .eq('id', row.id)
    }

    const { data: ideas } = await supabase.from('ideas').select('id, created_by_name').eq('poll_id', pollId)
    const ideaIds = (ideas ?? []).map((i) => i.id)
    if (ideaIds.length > 0) {
      await supabase
        .from('poll_idea_votes')
        .update({ respondent_name: newName })
        .in('idea_id', ideaIds)
        .eq('respondent_name', oldName)

      for (const idea of ideas ?? []) {
        if (idea.created_by_name?.toLowerCase() !== oldName.toLowerCase()) continue
        await supabase.from('ideas').update({ created_by_name: newName }).eq('id', idea.id)
      }
    }
  }

  const res = NextResponse.json({ creator_name: newName })
  appendPlanIdentityCookie(res, pollId, newName)
  return res
}
