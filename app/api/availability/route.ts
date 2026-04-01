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

  const { data: allAvailability } = await supabase
    .from('availability')
    .select('day_of_week, hour, minute, user_id, users(name)')

  const { data: allUsers } = await supabase.from('users').select('id, name').order('name')
  const totalUsers = allUsers?.length ?? 0
  const memberNames = (allUsers ?? [])
    .map((u) => u.name)
    .filter((n): n is string => Boolean(n))

  const aggregate: Record<string, number> = {}
  const namesPerSlot: Record<string, string[]> = {}
  const userSlots: string[] = []

  for (const row of allAvailability ?? []) {
    const minute = (row as any).minute ?? 0
    const key = `${row.day_of_week}-${row.hour}-${minute}`
    aggregate[key] = (aggregate[key] ?? 0) + 1
    if (!namesPerSlot[key]) namesPerSlot[key] = []
    namesPerSlot[key].push((row as any).users?.name ?? 'Unknown')
    if (user && row.user_id === user.id) userSlots.push(key)
  }

  return NextResponse.json({
    aggregate,
    namesPerSlot,
    userSlots,
    totalUsers,
    memberNames,
  })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slots } = await req.json()

  await supabase.from('availability').delete().eq('user_id', user.id)

  if (slots.length > 0) {
    const rows = slots.map((s: { day_of_week: number; hour: number; minute?: number }) => ({
      user_id: user.id,
      day_of_week: s.day_of_week,
      hour: s.hour,
      minute: s.minute ?? 0,
    }))
    const { error } = await supabase.from('availability').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
