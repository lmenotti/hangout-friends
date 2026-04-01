import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)

  const { data: events, error } = await supabase
    .from('events')
    .select('*, rsvps(user_id, status)')
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve RSVP user names separately to avoid FK ambiguity
  const allUserIds = [...new Set(
    (events ?? []).flatMap((e: any) => e.rsvps?.map((r: any) => r.user_id) ?? [])
  )]
  const { data: rsvpUsers } = allUserIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', allUserIds)
    : { data: [] }
  const userNameMap: Record<string, string> = {}
  for (const u of rsvpUsers ?? []) userNameMap[u.id] = u.name

  const result = (events ?? []).map((event: any) => {
    const rsvps = event.rsvps ?? []
    return {
      id: event.id,
      idea_id: event.idea_id,
      title: event.title,
      description: event.description,
      scheduled_at: event.scheduled_at,
      end_time: event.end_time ?? null,
      location: event.location ?? null,
      created_at: event.created_at,
      rsvp_yes: rsvps.filter((r: any) => r.status === 'yes').length,
      rsvp_maybe: rsvps.filter((r: any) => r.status === 'maybe').length,
      rsvp_no: rsvps.filter((r: any) => r.status === 'no').length,
      user_rsvp: user ? (rsvps.find((r: any) => r.user_id === user.id)?.status ?? null) : null,
      rsvp_yes_names: rsvps.filter((r: any) => r.status === 'yes').map((r: any) => userNameMap[r.user_id] ?? '?'),
      rsvp_maybe_names: rsvps.filter((r: any) => r.status === 'maybe').map((r: any) => userNameMap[r.user_id] ?? '?'),
      rsvp_no_names: rsvps.filter((r: any) => r.status === 'no').map((r: any) => userNameMap[r.user_id] ?? '?'),
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, scheduled_at, end_time, location, idea_id } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      end_time: end_time || null,
      location: location?.trim() || null,
      idea_id: idea_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
