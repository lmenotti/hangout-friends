import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

async function fetchTravelTimes(destination: string, origin: string): Promise<{ car: number | null; transit: number | null; walk: number | null }> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key || !destination.trim()) return { car: null, transit: null, walk: null }

  const orig = encodeURIComponent(origin)
  const dest = encodeURIComponent(destination)
  const base = 'https://maps.googleapis.com/maps/api/distancematrix/json'

  const [carRes, transitRes, walkRes] = await Promise.allSettled([
    fetch(`${base}?origins=${orig}&destinations=${dest}&mode=driving&key=${key}`),
    fetch(`${base}?origins=${orig}&destinations=${dest}&mode=transit&key=${key}`),
    fetch(`${base}?origins=${orig}&destinations=${dest}&mode=walking&key=${key}`),
  ])

  const parse = async (res: PromiseSettledResult<Response>): Promise<number | null> => {
    if (res.status !== 'fulfilled' || !res.value.ok) return null
    try {
      const json = await res.value.json()
      const secs = json?.rows?.[0]?.elements?.[0]?.duration?.value
      return typeof secs === 'number' ? Math.round(secs / 60) : null
    } catch {
      return null
    }
  }

  const [car, transit, walkRaw] = await Promise.all([parse(carRes), parse(transitRes), parse(walkRes)])
  const walk = walkRaw !== null && walkRaw <= 25 ? walkRaw : null
  return { car, transit, walk }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)

  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('id, title, description, created_by, created_at, duration_minutes, is_outdoor, location, travel_car_minutes, travel_transit_minutes, travel_walk_minutes, is_scheduled, suggested_at, travel_origin')
    .eq('is_scheduled', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: votes } = await supabase
    .from('idea_votes')
    .select('idea_id, user_id, users(name)')

  const creatorIds = [...new Set((ideas ?? []).map((i: any) => i.created_by).filter(Boolean))]
  const { data: creators } = creatorIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', creatorIds)
    : { data: [] }

  const creatorMap: Record<string, string> = {}
  for (const c of creators ?? []) creatorMap[c.id] = c.name

  const result = (ideas ?? []).map((idea: any) => {
    const ideaVotes = (votes ?? []).filter((v: any) => v.idea_id === idea.id)
    return {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      created_by: idea.created_by,
      created_at: idea.created_at,
      duration_minutes: idea.duration_minutes ?? null,
      is_outdoor: idea.is_outdoor ?? false,
      location: idea.location ?? null,
      travel_car_minutes: idea.travel_car_minutes ?? null,
      travel_transit_minutes: idea.travel_transit_minutes ?? null,
      travel_walk_minutes: idea.travel_walk_minutes ?? null,
      is_scheduled: idea.is_scheduled ?? false,
      suggested_at: idea.suggested_at ?? null,
      travel_origin: idea.travel_origin ?? null,
      creator_name: creatorMap[idea.created_by] ?? 'Unknown',
      vote_count: ideaVotes.length,
      user_voted: user ? ideaVotes.some((v: any) => v.user_id === user.id) : false,
      voter_names: ideaVotes.map((v: any) => (v as any).users?.name ?? 'Unknown'),
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, duration_minutes, is_outdoor, location, suggested_at } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const origin = (user as any).home_location?.trim() || 'Berkeley, CA'
  const travel = location?.trim() ? await fetchTravelTimes(location.trim(), origin) : { car: null, transit: null, walk: null }

  const { data, error } = await supabase
    .from('ideas')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      created_by: user.id,
      duration_minutes: duration_minutes ?? null,
      is_outdoor: is_outdoor ?? false,
      location: location?.trim() || null,
      travel_car_minutes: travel.car,
      travel_transit_minutes: travel.transit,
      travel_walk_minutes: travel.walk,
      travel_origin: location?.trim() ? origin : null,
      suggested_at: suggested_at || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
