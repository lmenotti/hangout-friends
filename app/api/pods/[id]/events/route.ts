import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
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

  const { data: events, error } = await supabase
    .from('events')
    .select('*, rsvps(user_id, status)')
    .eq('pod_id', podId)
    .is('parent_event_id', null)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allUserIds = [...new Set((events ?? []).flatMap((e: any) => e.rsvps?.map((r: any) => r.user_id) ?? []))]
  const { data: rsvpUsers } = allUserIds.length
    ? await supabase.from('users').select('id, name').in('id', allUserIds)
    : { data: [] }
  const userNameMap: Record<string, string> = {}
  for (const u of rsvpUsers ?? []) userNameMap[u.id] = u.name

  const result = (events ?? []).map((event: any) => {
    const rsvps = event.rsvps ?? []
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      scheduled_at: event.scheduled_at,
      end_time: event.end_time ?? null,
      location: event.location ?? null,
      pod_id: event.pod_id,
      source_idea_id: event.source_idea_id ?? null,
      recurrence_rule: event.recurrence_rule ?? null,
      recurrence_end: event.recurrence_end ?? null,
      created_at: event.created_at,
      created_by: event.created_by ?? null,
      rsvp_yes: rsvps.filter((r: any) => r.status === 'yes').length,
      rsvp_maybe: rsvps.filter((r: any) => r.status === 'maybe').length,
      rsvp_no: rsvps.filter((r: any) => r.status === 'no').length,
      user_rsvp: rsvps.find((r: any) => r.user_id === user.id)?.status ?? null,
      rsvp_yes_names: rsvps.filter((r: any) => r.status === 'yes').map((r: any) => userNameMap[r.user_id] ?? '?'),
      rsvp_maybe_names: rsvps.filter((r: any) => r.status === 'maybe').map((r: any) => userNameMap[r.user_id] ?? '?'),
      rsvp_no_names: rsvps.filter((r: any) => r.status === 'no').map((r: any) => userNameMap[r.user_id] ?? '?'),
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

  const { title, description, scheduled_at, end_time, location, recurrence_rule, recurrence_end } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      end_time: end_time || null,
      location: location?.trim() || null,
      pod_id: podId,
      created_by: user.id,
      recurrence_rule: recurrence_rule || null,
      recurrence_end: recurrence_end || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
