import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { buildIcsCalendar, calendarEventFromPoll } from '@/lib/ics'

function slugifyFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base ? `${base}.ics` : 'hangout-plan.ics'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: poll, error } = await supabase
    .from('polls')
    .select('id, title, creator_name, status, scheduled_at, scheduled_end_at, scheduled_idea_id')
    .eq('id', id)
    .single()

  if (error || !poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.status !== 'scheduled' || !poll.scheduled_at) {
    return NextResponse.json({ error: 'This plan is not scheduled yet.' }, { status: 400 })
  }

  let ideaTitle: string | null = null
  let location: string | null = null
  if (poll.scheduled_idea_id) {
    const { data: idea } = await supabase
      .from('ideas')
      .select('title, location')
      .eq('id', poll.scheduled_idea_id)
      .single()
    if (idea) {
      ideaTitle = idea.title
      location = idea.location
    }
  }

  const origin = req.nextUrl.origin
  const event = calendarEventFromPoll({
    pollId: poll.id,
    title: poll.title,
    creatorName: poll.creator_name,
    scheduledAt: poll.scheduled_at,
    scheduledEndAt: poll.scheduled_end_at,
    ideaTitle,
    location,
    planUrl: `${origin}/polls/${poll.id}`,
  })

  if (!event) {
    return NextResponse.json({ error: 'This plan is not scheduled yet.' }, { status: 400 })
  }

  const ics = buildIcsCalendar(event)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slugifyFilename(poll.title)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
