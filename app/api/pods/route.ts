import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberships, error } = await supabase
    .from('pod_members')
    .select('pod_id, role, joined_at, pods(id, name, invite_code, created_at, created_by)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const podIds = (memberships ?? []).map(m => m.pod_id)
  const { data: allMembers } = podIds.length
    ? await supabase.from('pod_members').select('pod_id').in('pod_id', podIds)
    : { data: [] }

  const counts: Record<string, number> = {}
  for (const m of allMembers ?? []) {
    counts[m.pod_id] = (counts[m.pod_id] ?? 0) + 1
  }

  const pods = (memberships ?? []).map(m => ({
    ...(m.pods as any),
    role: m.role,
    member_count: counts[m.pod_id] ?? 1,
  }))

  return NextResponse.json(pods)
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  let invite_code = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase.from('pods').select('id').eq('invite_code', invite_code).single()
    if (!existing) break
    invite_code = generateInviteCode()
  }

  const { data: pod, error } = await supabase
    .from('pods')
    .insert({ name: name.trim(), invite_code, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('pod_members').insert({ pod_id: pod.id, user_id: user.id, role: 'owner' })

  return NextResponse.json(pod)
}
