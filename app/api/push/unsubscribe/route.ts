import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { endpoint } = await req.json()
  if (!endpoint?.trim()) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint.trim())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
