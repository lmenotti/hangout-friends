import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

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

  const slug = await generateSlug(title.trim())

  const { data, error } = await supabase
    .from('polls')
    .insert({
      title: title.trim(),
      creator_name: creator_name?.trim() || 'Someone',
      date_options,
      expires_at,
      slug,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
