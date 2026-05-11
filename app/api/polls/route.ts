import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { title, creator_name, date_options, expires_at } = await req.json()

  if (!title?.trim() || !creator_name?.trim() || !date_options?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('polls')
    .insert({ title: title.trim(), creator_name: creator_name.trim(), date_options, expires_at })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
