import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchCommuteMinutes, findBestSlot } from '../route'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all unscheduled ideas with 2+ votes, sorted by vote count descending (highest priority first)
  const { data: allVotes } = await supabase.from('idea_votes').select('idea_id, user_id')
  if (!allVotes || allVotes.length === 0) {
    return NextResponse.json({ error: 'No ideas have been voted on yet.' }, { status: 400 })
  }

  // Count votes per idea
  const voteMap: Record<string, string[]> = {}
  for (const v of allVotes) {
    if (!voteMap[v.idea_id]) voteMap[v.idea_id] = []
    voteMap[v.idea_id].push(v.user_id)
  }

  const eligibleIdeaIds = Object.entries(voteMap)
    .filter(([, voters]) => voters.length >= 2)
    .map(([id]) => id)

  if (eligibleIdeaIds.length === 0) {
    return NextResponse.json({ error: 'No ideas have 2+ votes yet.' }, { status: 400 })
  }

  const { data: ideas } = await supabase
    .from('ideas')
    .select()
    .in('id', eligibleIdeaIds)
    .eq('is_scheduled', false)

  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ error: 'All eligible ideas are already scheduled.' }, { status: 400 })
  }

  // Sort by vote count descending — high-priority ideas claim best slots first
  ideas.sort((a, b) => (voteMap[b.id]?.length ?? 0) - (voteMap[a.id]?.length ?? 0))

  // Get all unique voter IDs across all ideas
  const allVoterIds = [...new Set(ideas.flatMap(idea => voteMap[idea.id] ?? []))]

  // Fetch all voter availability + home locations in one round trip
  const [availResult, usersResult] = await Promise.all([
    supabase.from('availability').select('day_of_week, hour, minute, user_id').in('user_id', allVoterIds),
    supabase.from('users').select('id, home_location').in('id', allVoterIds),
  ])

  const allAvailability = availResult.data ?? []
  const allUsers = usersResult.data ?? []

  // Blocked hours from existing confirmed RSVPs
  const { data: eventRsvps } = await supabase
    .from('rsvps')
    .select('user_id, status, events(scheduled_at, end_time)')
    .in('user_id', allVoterIds)
    .in('status', ['yes', 'maybe'])

  const baseBlockedHours = new Set<string>()
  for (const rsvp of eventRsvps ?? []) {
    const event = (rsvp as any).events
    if (!event?.scheduled_at) continue
    const start = new Date(event.scheduled_at)
    const startDay = start.getUTCDay()
    const startHour = start.getUTCHours()
    let endHour = startHour + 1
    if (event.end_time) {
      const end = new Date(event.end_time)
      endHour = end.getUTCHours() + (end.getUTCMinutes() > 0 ? 1 : 0)
    }
    for (let h = startHour; h < endHour; h++) baseBlockedHours.add(`${startDay}-${h}`)
  }

  const now = new Date()
  const claimedSlots = new Set<string>()  // grows as each idea is scheduled

  const scheduled: Array<{ idea_title: string; day: string; time: string; voters: number; weather?: string }> = []
  const skipped: string[] = []

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const fmt = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`

  for (const idea of ideas) {
    const voterIds = voteMap[idea.id] ?? []
    const voterAvailability = allAvailability.filter(r => voterIds.includes(r.user_id))

    if (voterAvailability.length === 0) {
      skipped.push(idea.title)
      continue
    }

    // Commute times for this idea's voters
    const voterCommutes: Record<string, number> = {}
    if (idea.location?.trim()) {
      const voterUsers = allUsers.filter(u => voterIds.includes(u.id) && u.home_location?.trim())
      if (voterUsers.length > 0) {
        const origins = voterUsers.map(u => u.home_location!)
        const times = await fetchCommuteMinutes(origins, idea.location)
        voterUsers.forEach((u, i) => {
          if (times[i] !== null) voterCommutes[u.id] = times[i]!
        })
      }
    }

    const best = await findBestSlot({
      idea, voterIds, voterAvailability, voterCommutes,
      blockedHours: baseBlockedHours, claimedSlots, now,
    })

    if (!best) {
      skipped.push(idea.title)
      continue
    }

    // Create the event
    let end_time: string | null = null
    if (idea.duration_minutes) {
      const endDate = new Date(best.scheduledDate)
      endDate.setMinutes(endDate.getMinutes() + idea.duration_minutes)
      end_time = endDate.toISOString()
    }

    const { error } = await supabase.from('events').insert({
      title: idea.title,
      description: idea.description,
      idea_id: idea.id,
      scheduled_at: best.scheduledDate.toISOString(),
      end_time,
      location: idea.location ?? null,
      created_by: user.id,
    })

    if (error) {
      skipped.push(idea.title)
      continue
    }

    await supabase.from('ideas').update({ is_scheduled: true }).eq('id', idea.id)

    // Claim the event's hours so later ideas don't overlap
    const durationHours = idea.duration_minutes ? Math.ceil(idea.duration_minutes / 60) : 1
    for (let h = 0; h < durationHours; h++) {
      claimedSlots.add(`${best.day}-${best.hour + h}`)
    }

    const weatherNote = idea.is_outdoor
      ? best.weatherScore >= 8 ? '☀' : best.weatherScore >= 5 ? '🌤' : '🌧'
      : undefined

    scheduled.push({
      idea_title: idea.title,
      day: dayNames[best.day],
      time: fmt(best.hour),
      voters: best.voterCount,
      weather: weatherNote,
    })
  }

  if (scheduled.length === 0) {
    return NextResponse.json({ error: 'Could not find available slots for any ideas. Make sure voters have filled in their availability.' }, { status: 400 })
  }

  return NextResponse.json({ scheduled, skipped })
}
