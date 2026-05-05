import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await req.json()
  if (!invite_code?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const { data: pod } = await supabase
    .from('pods')
    .select('*')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .single()

  if (!pod) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  const { data: existing } = await supabase
    .from('pod_members')
    .select('pod_id')
    .eq('pod_id', pod.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('pod_members').insert({ pod_id: pod.id, user_id: user.id, role: 'member' })
  }

  return NextResponse.json(pod)
}
