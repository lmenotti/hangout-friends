import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

async function fetchTravelTimes(destination: string, origin: string) {
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
    } catch { return null }
  }

  const [car, transit, walkRaw] = await Promise.all([parse(carRes), parse(transitRes), parse(walkRes)])
  return { car, transit, walk: walkRaw !== null && walkRaw <= 25 ? walkRaw : null }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('ideas').select().eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, duration_minutes, is_outdoor, location, suggested_at } = await req.json()

  let travelFields: Record<string, any> = {}
  const newLocation = location?.trim() || null
  if (newLocation !== existing.location) {
    if (newLocation) {
      const origin = (user as any).home_location?.trim() || 'Berkeley, CA'
      const travel = await fetchTravelTimes(newLocation, origin)
      travelFields = {
        travel_car_minutes: travel.car,
        travel_transit_minutes: travel.transit,
        travel_walk_minutes: travel.walk,
        travel_origin: origin,
      }
    } else {
      travelFields = { travel_car_minutes: null, travel_transit_minutes: null, travel_walk_minutes: null, travel_origin: null }
    }
  }

  const { data, error } = await supabase
    .from('ideas')
    .update({
      title: title?.trim() || existing.title,
      description: description?.trim() || null,
      duration_minutes: duration_minutes ?? existing.duration_minutes,
      is_outdoor: is_outdoor ?? existing.is_outdoor,
      location: newLocation,
      suggested_at: suggested_at || null,
      ...travelFields,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('ideas').select('created_by').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('idea_votes').delete().eq('idea_id', id)
  const { error } = await supabase.from('ideas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
