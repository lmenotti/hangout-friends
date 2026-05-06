import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromToken(req.headers.get('x-user-token'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('pod_members')
    .select('role')
    .eq('pod_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { data: pod, error } = await supabase
    .from('pods')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Pod not found' }, { status: 404 })

  const { data: members } = await supabase
    .from('pod_members')
    .select('role, joined_at, users(id, name, last_seen)')
    .eq('pod_id', id)
    .order('joined_at')

  return NextResponse.json({ pod, members: members ?? [], role: membership.role })
}
