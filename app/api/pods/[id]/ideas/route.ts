import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id, name').eq('token', token).single()
  return data
}

async function assertMember(podId: string, userId: string) {
  const { data } = await supabase.from('pod_members').select('role').eq('pod_id', podId).eq('user_id', userId).single()
  return data
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: podId } = await params
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user || !await assertMember(podId, user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sort = req.nextUrl.searchParams.get('sort') ?? 'votes'

  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('pod_id', podId)
    .neq('status', 'archived')
    .order(sort === 'votes' ? 'vote_count' : sort === 'date' ? 'proposed_date' : 'created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: votes } = await supabase.from('idea_votes').select('idea_id, user_id, users(name)').in(
    'idea_id', (ideas ?? []).map((i: any) => i.id)
  )

  const creatorIds = [...new Set((ideas ?? []).map((i: any) => i.created_by).filter(Boolean))]
  const { data: creators } = creatorIds.length
    ? await supabase.from('users').select('id, name').in('id', creatorIds)
    : { data: [] }
  const creatorMap: Record<string, string> = {}
  for (const c of creators ?? []) creatorMap[c.id] = c.name

  const result = (ideas ?? []).map((idea: any) => {
    const ideaVotes = (votes ?? []).filter((v: any) => v.idea_id === idea.id)
    return {
      ...idea,
      creator_name: creatorMap[idea.created_by] ?? 'Unknown',
      vote_count: ideaVotes.length,
      user_voted: ideaVotes.some((v: any) => v.user_id === user.id),
      voter_names: ideaVotes.map((v: any) => (v as any).users?.name ?? '?'),
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: podId } = await params
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user || !await assertMember(podId, user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, description, suggested_place, proposed_date, proposed_time } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('ideas')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      suggested_place: suggested_place?.trim() || null,
      proposed_date: proposed_date || null,
      proposed_time: proposed_time || null,
      pod_id: podId,
      created_by: user.id,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
