import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ exists: false })

  const { data } = await supabase
    .from('users')
    .select('id')
    .ilike('name', name)
    .single()

  return NextResponse.json({ exists: !!data })
}
