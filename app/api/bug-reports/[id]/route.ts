import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPin, isAdminPinConfigured } from '@/lib/adminPin'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminPinConfigured()) {
    return NextResponse.json(
      { error: 'Admin PIN is not configured on this server.' },
      { status: 503 },
    )
  }
  if (!checkAdminPin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { resolved } = await req.json()

  const { error } = await supabase
    .from('bug_reports')
    .update({ resolved })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
