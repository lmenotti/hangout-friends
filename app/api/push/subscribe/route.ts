import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import type { PlanWatch } from '@/lib/pushNotifications'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id, name').eq('token', token).maybeSingle()
  return data
}

function mergeWatches(existing: PlanWatch[], incoming: PlanWatch[]): PlanWatch[] {
  const key = (w: PlanWatch) =>
    `${w.poll_id}:${w.role}:${(w.respondent_name ?? '').toLowerCase()}`
  const map = new Map<string, PlanWatch>()
  for (const w of existing) map.set(key(w), w)
  for (const w of incoming) map.set(key(w), w)
  return [...map.values()]
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { endpoint, keys, device_id, plan_watches } = body as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
    device_id?: string
    plan_watches?: PlanWatch[]
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  const deviceId = device_id?.trim() || null

  if (!user && !deviceId) {
    return NextResponse.json({ error: 'device_id or account required' }, { status: 400 })
  }

  const incomingWatches = Array.isArray(plan_watches) ? plan_watches : []

  const { data: existing } = await supabase
    .from('push_subscriptions')
    .select('id, plan_watches')
    .eq('endpoint', endpoint)
    .maybeSingle()

  const mergedWatches = mergeWatches(
    (existing?.plan_watches ?? []) as PlanWatch[],
    incomingWatches,
  )

  const row = {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_id: user?.id ?? null,
    device_id: user ? null : deviceId,
    plan_watches: mergedWatches,
  }

  if (existing) {
    const { error } = await supabase.from('push_subscriptions').update(row).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: existing.id })
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert(row)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
