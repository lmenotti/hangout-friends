import { NextRequest, NextResponse } from 'next/server'
import { appendPlanIdentityCookie, normalizePlanIdentityName } from '@/lib/planIdentity'
import { notifyPlanCreatorOfResponse } from '@/lib/pushNotifications'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { respondent_name, availability } = await req.json()

  const name = normalizePlanIdentityName(respondent_name ?? '')
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('poll_responses')
    .select('id')
    .eq('poll_id', id)
    .eq('respondent_name', name)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('poll_responses')
      .update({ availability })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const res = NextResponse.json(data)
    appendPlanIdentityCookie(res, id, name)
    return res
  }

  const { data, error } = await supabase
    .from('poll_responses')
    .insert({ poll_id: id, respondent_name: name, availability })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const res = NextResponse.json(data)
  appendPlanIdentityCookie(res, id, name)
  void notifyPlanCreatorOfResponse(id, name)
  return res
}
