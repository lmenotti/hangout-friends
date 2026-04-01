import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { geocodeLocation, fetchWeatherMap, lookupWeatherScore } from '@/lib/weather'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function fetchCommuteMinutes(origins: string[], destination: string): Promise<(number | null)[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key || !destination.trim() || origins.length === 0) return origins.map(() => null)

  const origs = origins.map(o => encodeURIComponent(o.trim())).join('|')
  const dest = encodeURIComponent(destination.trim())
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origs}&destinations=${dest}&mode=driving&key=${key}`

  try {
    const res = await fetch(url)
    if (!res.ok) return origins.map(() => null)
    const json = await res.json()
    return (json?.rows ?? []).map((row: any) => {
      const secs = row?.elements?.[0]?.duration?.value
      return typeof secs === 'number' ? Math.round(secs / 60) : null
    })
  } catch {
    return origins.map(() => null)
  }
}

export type SlotCandidate = {
  day: number
  hour: number
  voterCount: number
  scheduledDate: Date
  weatherScore: number
}

// Core slot-finding logic shared with the all-scheduler.
// claimedSlots: additional "day-hour" keys to block (used by global scheduler).
export async function findBestSlot(params: {
  idea: any
  voterIds: string[]
  voterAvailability: any[]
  voterCommutes: Record<string, number>
  blockedHours: Set<string>
  claimedSlots: Set<string>
  now: Date
}): Promise<SlotCandidate | null> {
  const { idea, voterIds, voterAvailability, voterCommutes, blockedHours, claimedSlots, now } = params

  const availSet = new Set<string>()
  for (const row of voterAvailability) {
    availSet.add(`${row.user_id}-${row.day_of_week}-${row.hour}`)
  }

  // Per-hour voter count with commute buffer check
  const aggregate: Record<string, Set<string>> = {}
  for (const voterId of voterIds) {
    const commuteMinutes = voterCommutes[voterId] ?? 0
    const bufferHours = Math.ceil(commuteMinutes / 60)

    for (const row of voterAvailability.filter(r => r.user_id === voterId)) {
      const hourKey = `${row.day_of_week}-${row.hour}`
      if (blockedHours.has(hourKey) || claimedSlots.has(hourKey)) continue

      let hasBuffer = true
      for (let b = 1; b <= bufferHours; b++) {
        const bufHour = row.hour - b
        if (bufHour < 0 || !availSet.has(`${voterId}-${row.day_of_week}-${bufHour}`)) {
          hasBuffer = false
          break
        }
      }
      if (!hasBuffer) continue

      if (!aggregate[hourKey]) aggregate[hourKey] = new Set()
      aggregate[hourKey].add(voterId)
    }
  }

  const overlapping = Object.entries(aggregate).filter(([, users]) => users.size >= 2)
  if (overlapping.length === 0) return null

  // Compute scheduledDate for each candidate
  const candidates: SlotCandidate[] = overlapping.map(([key, users]) => {
    const [dayStr, hourStr] = key.split('-')
    const day = parseInt(dayStr)
    const hour = parseInt(hourStr)
    const daysUntil = (day - now.getDay() + 7) % 7 || 7
    const scheduledDate = new Date(now)
    scheduledDate.setDate(now.getDate() + daysUntil)
    scheduledDate.setHours(hour, 0, 0, 0)
    return { day, hour, voterCount: users.size, scheduledDate, weatherScore: 5 }
  })

  // Weather scoring for outdoor ideas with a location
  let weatherMap = new Map<string, number>()
  if (idea.is_outdoor && idea.location?.trim()) {
    const coords = await geocodeLocation(idea.location)
    if (coords) {
      weatherMap = await fetchWeatherMap(coords.lat, coords.lon)
    }
  }

  for (const c of candidates) {
    c.weatherScore = weatherMap.size > 0 ? lookupWeatherScore(weatherMap, c.scheduledDate) : 5
  }

  // Sort: voter count dominates (×20), weather breaks ties (0–10)
  candidates.sort((a, b) =>
    (b.voterCount * 20 + b.weatherScore) - (a.voterCount * 20 + a.weatherScore)
  )

  return candidates[0]
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { idea_id } = await req.json()

  const { data: idea } = await supabase.from('ideas').select().eq('id', idea_id).single()
  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

  const { data: votes } = await supabase.from('idea_votes').select('user_id').eq('idea_id', idea_id)
  const voterIds = (votes ?? []).map((v: any) => v.user_id)
  if (voterIds.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 upvotes to auto-schedule.' }, { status: 400 })
  }

  const [availResult, usersResult] = await Promise.all([
    supabase.from('availability').select('day_of_week, hour, minute, user_id').in('user_id', voterIds),
    supabase.from('users').select('id, home_location').in('id', voterIds),
  ])

  const voterAvailability = availResult.data
  if (!voterAvailability || voterAvailability.length === 0) {
    return NextResponse.json({ error: 'None of the voters have filled in their availability yet.' }, { status: 400 })
  }

  // Commute times
  const voterCommutes: Record<string, number> = {}
  if (idea.location?.trim() && usersResult.data) {
    const voterUsers = usersResult.data.filter(u => u.home_location?.trim())
    if (voterUsers.length > 0) {
      const origins = voterUsers.map(u => u.home_location!)
      const times = await fetchCommuteMinutes(origins, idea.location)
      voterUsers.forEach((u, i) => {
        if (times[i] !== null) voterCommutes[u.id] = times[i]!
      })
    }
  }

  // Blocked hours from existing RSVPs
  const { data: eventRsvps } = await supabase
    .from('rsvps')
    .select('user_id, status, events(scheduled_at, end_time)')
    .in('user_id', voterIds)
    .in('status', ['yes', 'maybe'])

  const blockedHours = new Set<string>()
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
    for (let h = startHour; h < endHour; h++) blockedHours.add(`${startDay}-${h}`)
  }

  const best = await findBestSlot({
    idea, voterIds, voterAvailability, voterCommutes,
    blockedHours, claimedSlots: new Set(), now: new Date(),
  })

  if (!best) {
    return NextResponse.json({ error: 'No overlapping free time found among the voters.' }, { status: 400 })
  }

  let end_time: string | null = null
  if (idea.duration_minutes) {
    const endDate = new Date(best.scheduledDate)
    endDate.setMinutes(endDate.getMinutes() + idea.duration_minutes)
    end_time = endDate.toISOString()
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: idea.title,
      description: idea.description,
      idea_id: idea.id,
      scheduled_at: best.scheduledDate.toISOString(),
      end_time,
      location: idea.location ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('ideas').update({ is_scheduled: true }).eq('id', idea_id)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const fmt = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`

  const parts: string[] = [
    `Scheduled for ${dayNames[best.day]} at ${fmt(best.hour)} — ${best.voterCount} of ${voterIds.length} voters are free!`,
  ]
  if (Object.keys(voterCommutes).length > 0) parts.push('Commute times factored in.')
  if (idea.is_outdoor && best.weatherScore >= 8) parts.push('☀ Great weather expected.')
  else if (idea.is_outdoor && best.weatherScore >= 5) parts.push('🌤 Decent weather expected.')
  else if (idea.is_outdoor && best.weatherScore < 5) parts.push('🌧 Weather may be iffy — have a backup plan.')

  return NextResponse.json({ event, message: parts.join(' ') })
}
