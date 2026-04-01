import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getUserFromToken(token: string | null) {
  if (!token) return null
  const { data } = await supabase.from('users').select().eq('token', token).single()
  return data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: ideaId } = await params
  const token = req.headers.get('x-user-token')
  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if already voted
  const { data: existing } = await supabase
    .from('idea_votes')
    .select()
    .eq('idea_id', ideaId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Toggle off
    await supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('user_id', user.id)
    return NextResponse.json({ voted: false })
  } else {
    await supabase.from('idea_votes').insert({ idea_id: ideaId, user_id: user.id })
    return NextResponse.json({ voted: true })
  }
}
