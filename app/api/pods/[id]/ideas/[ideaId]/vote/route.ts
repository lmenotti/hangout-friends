import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

async function assertMember(podId: string, userId: string) {
  const { data } = await supabase.from('pod_members').select('role').eq('pod_id', podId).eq('user_id', userId).single()
  return data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; ideaId: string }> }) {
  const { id: podId, ideaId } = await params
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user || !await assertMember(podId, user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('idea_votes')
    .select('idea_id')
    .eq('idea_id', ideaId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('user_id', user.id)
    const { data: idea } = await supabase.from('ideas').select('vote_count').eq('id', ideaId).single()
    await supabase.from('ideas').update({ vote_count: Math.max(0, (idea?.vote_count ?? 1) - 1) }).eq('id', ideaId)
    return NextResponse.json({ voted: false })
  }

  await supabase.from('idea_votes').insert({ idea_id: ideaId, user_id: user.id })
  const { data: idea } = await supabase.from('ideas').select('vote_count').eq('id', ideaId).single()
  await supabase.from('ideas').update({ vote_count: (idea?.vote_count ?? 0) + 1 }).eq('id', ideaId)
  return NextResponse.json({ voted: true })
}
