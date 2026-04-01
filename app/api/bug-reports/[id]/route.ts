import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = (process.env.ADMIN_PIN ?? '1234').trim()

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if ((req.headers.get('x-admin-pin') ?? '').trim() !== ADMIN_PIN) {
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
