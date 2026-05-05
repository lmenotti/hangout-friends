import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data: poll, error } = await supabase
    .from('polls')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

  const { data: responses } = await supabase
    .from('poll_responses')
    .select('*')
    .eq('poll_id', params.id)
    .order('created_at')

  const aggregate: Record<string, number> = {}
  for (const r of responses ?? []) {
    for (const [slot, free] of Object.entries(r.availability ?? {})) {
      if (free) aggregate[slot] = (aggregate[slot] ?? 0) + 1
    }
  }

  return NextResponse.json({ poll, responses: responses ?? [], aggregate })
}
