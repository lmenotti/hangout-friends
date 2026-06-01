import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { buildMagicLinkEmail, buildMagicLinkUrl } from '@/lib/magicLinkEmail'
import { sendEmail } from '@/lib/sendEmail'
import { MAGIC_LINK_TTL_MS, normalizeEmail, sanitizeReturnTo } from '@/lib/magicLink'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = normalizeEmail(body.email ?? '')
  const returnTo = sanitizeReturnTo(body.returnTo)

  if (!email) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString()

  const { error: insertError } = await supabase.from('magic_link_tokens').insert({
    token,
    email,
    name: null,
    return_to: returnTo,
    expires_at: expiresAt,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const link = buildMagicLinkUrl(token, returnTo !== '/profile' ? returnTo : undefined)
  const { subject, html, text } = buildMagicLinkEmail({ link })

  try {
    const result = await sendEmail({ to: email, subject, html, text })
    return NextResponse.json({
      ok: true,
      message: result.sent
        ? 'Check your email for a sign-in link.'
        : 'Sign-in link created (email not configured in this environment).',
      ...(process.env.NODE_ENV !== 'production' && !result.sent ? { devLink: link } : {}),
    })
  } catch (err) {
    await supabase.from('magic_link_tokens').delete().eq('token', token)
    const message = err instanceof Error ? err.message : 'Failed to send email'
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    const status = isProd && message.includes('RESEND_API_KEY') ? 503 : 500
    return NextResponse.json(
      {
        error: isProd && message.includes('RESEND_API_KEY')
          ? 'Sign-in email is temporarily unavailable. Please try again later.'
          : message,
      },
      { status },
    )
  }
}
