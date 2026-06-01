import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const PLAN_IDENTITY_PREFIX = 'hangout_plan_'
const CREATOR_COOKIE_PREFIX = 'hangout_creator_'

const POLL_FIELDS = 'id, slug, title, status, date_options, creator_name, created_at, scheduled_at'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select('id').eq('token', token).single()
  return data
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)

  // Collect poll IDs the device has interacted with via respondent or creator cookies.
  const devicePollIds = new Set<string>()
  for (const { name } of cookieStore.getAll()) {
    if (name.startsWith(PLAN_IDENTITY_PREFIX)) {
      devicePollIds.add(name.slice(PLAN_IDENTITY_PREFIX.length))
    } else if (name.startsWith(CREATOR_COOKIE_PREFIX)) {
      devicePollIds.add(name.slice(CREATOR_COOKIE_PREFIX.length))
    }
  }

  const [createdRes, deviceRes] = await Promise.all([
    user
      ? supabase
          .from('polls')
          .select(POLL_FIELDS)
          .eq('creator_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),

    devicePollIds.size > 0
      ? supabase
          .from('polls')
          .select(POLL_FIELDS)
          .in('id', [...devicePollIds])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])

  const createdIds = new Set((createdRes.data ?? []).map((p) => p.id as string))
  const onDevice = (deviceRes.data ?? []).filter((p) => !createdIds.has(p.id as string))

  return NextResponse.json({
    created: createdRes.data ?? [],
    on_device: onDevice,
  })
}
