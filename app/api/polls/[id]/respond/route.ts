import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { respondent_name, availability } = await req.json()

  if (!respondent_name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const name = respondent_name.trim()

  const { data: existing } = await supabase
    .from('poll_responses')
    .select('id')
    .eq('poll_id', params.id)
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
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('poll_responses')
    .insert({ poll_id: params.id, respondent_name: name, availability })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
