import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPin } from '@/lib/requireAdminPin'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdminPin(req)
  if (authError) return authError

  const { id } = await params
  const { resolved } = await req.json()

  const { error } = await supabase
    .from('bug_reports')
    .update({ resolved })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
