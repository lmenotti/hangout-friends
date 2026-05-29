import { NextRequest, NextResponse } from 'next/server'
import { appendPlanIdentityCookie } from '@/lib/planIdentity'
import { supabaseAdmin as supabase } from '@/lib/supabase'

const PLAN_RETENTION_DAYS = 30

/** 30 days after the last polled date (end of that UTC day). */
function computeExpiresAtFromDateOptions(dateOptions: string[]): string {
  const lastDate = [...dateOptions].sort().at(-1)
  if (!lastDate) {
    const fallback = new Date()
    fallback.setUTCDate(fallback.getUTCDate() + PLAN_RETENTION_DAYS)
    return fallback.toISOString()
  }
  const expires = new Date(`${lastDate}T23:59:59.999Z`)
  expires.setUTCDate(expires.getUTCDate() + PLAN_RETENTION_DAYS)
  return expires.toISOString()
}

function buildSlugBase(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'plan'
  )
}

async function generateSlug(title: string): Promise<string> {
  const base = buildSlugBase(title)
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
    const slug = `${base}-${suffix}`
    const { data } = await supabase.from('polls').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
  }
  // Extremely unlikely fallback
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

export async function POST(req: NextRequest) {
  const { title, creator_name, date_options, expires_at } = await req.json()

  if (!title?.trim() || !date_options?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const resolvedExpiresAt =
    expires_at ?? computeExpiresAtFromDateOptions(date_options as string[])

  let data: unknown = null
  let error: unknown = null
  try {
    const slug = await generateSlug(title.trim())
    ;({ data, error } = await supabase
      .from('polls')
      .insert({
        title: title.trim(),
        creator_name: creator_name?.trim() || 'Someone',
        date_options,
        expires_at: resolvedExpiresAt,
        slug,
      })
      .select()
      .single())
  } catch (e) {
    // Thrown before we even reach Supabase (e.g. missing admin credentials).
    error = e
  }

  if (error) {
    // Don't leak backend specifics (e.g. Supabase's "Invalid API key") to the
    // anonymous link flow — it's confusing and exposes infra detail. Log the
    // real error for diagnosis and return a friendly message instead.
    console.error('[api/polls] failed to create plan:', error)
    return NextResponse.json(
      { error: 'Could not create the plan. Please try again.' },
      { status: 500 },
    )
  }
  const res = NextResponse.json(data)
  if (creator_name?.trim() && data && typeof data === 'object' && 'id' in data) {
    appendPlanIdentityCookie(res, String((data as { id: string }).id), creator_name.trim())
  }
  return res
}
