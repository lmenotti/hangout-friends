import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = (process.env.ADMIN_PIN ?? '1234').trim()

function checkPin(req: NextRequest) {
  return (req.headers.get('x-admin-pin') ?? '').trim() === ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [usersRes, ideasRes, eventsRes, bugsRes] = await Promise.all([
    supabase.from('users').select('id, name, created_at').order('created_at', { ascending: false }),
    supabase.from('ideas').select('id, title, description, created_at, created_by, idea_votes(user_id)').order('created_at', { ascending: false }),
    supabase.from('events').select('id, title, scheduled_at, created_at').order('created_at', { ascending: false }),
    supabase.from('bug_reports').select('id, title, description, reported_at, reported_by, resolved').order('reported_at', { ascending: false }),
  ])

  const creatorIds = [...new Set((ideasRes.data ?? []).map((i: any) => i.created_by).filter(Boolean))]
  const { data: creators } = creatorIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', creatorIds)
    : { data: [] }
  const creatorMap: Record<string, string> = {}
  for (const c of creators ?? []) creatorMap[c.id] = c.name

  const reporterIds = [...new Set((bugsRes.data ?? []).map((b: any) => b.reported_by).filter(Boolean))]
  const { data: reporters } = reporterIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', reporterIds)
    : { data: [] }
  const reporterMap: Record<string, string> = {}
  for (const r of reporters ?? []) reporterMap[r.id] = r.name

  return NextResponse.json({
    users: usersRes.data ?? [],
    ideas: (ideasRes.data ?? []).map((i: any) => ({
      ...i,
      creator_name: creatorMap[i.created_by] ?? 'Unknown',
      vote_count: i.idea_votes?.length ?? 0,
    })),
    events: eventsRes.data ?? [],
    bug_reports: (bugsRes.data ?? []).map((b: any) => ({
      ...b,
      reporter_name: reporterMap[b.reported_by] ?? 'Unknown',
    })),
  })
}

export async function DELETE(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, id } = await req.json()

  const tableMap: Record<string, string> = {
    user: 'users',
    idea: 'ideas',
    event: 'events',
    bug_report: 'bug_reports',
  }

  const table = tableMap[type]
  if (!table) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
