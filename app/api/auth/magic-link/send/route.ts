import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getAppBaseUrl } from '@/lib/appUrl'
import { sendEmail } from '@/lib/sendEmail'
import { MAGIC_LINK_TTL_MS, normalizeEmail, sanitizeReturnTo } from '@/lib/magicLink'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = normalizeEmail(body.email ?? '')
  const mode = body.mode === 'signup' ? 'signup' : 'signin'
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const returnTo = sanitizeReturnTo(body.returnTo)

  if (!email) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (mode === 'signup') {
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Enter your first name (at least 2 characters).' }, { status: 400 })
    }
    if (name.length > 40) {
      return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
    }

    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existingByEmail) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 },
      )
    }
  } else {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (!existingUser) {
      // Avoid email enumeration — same response whether or not account exists.
      return NextResponse.json({ ok: true, message: 'If an account exists, we sent a sign-in link.' })
    }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString()

  const { error: insertError } = await supabase.from('magic_link_tokens').insert({
    token,
    email,
    name: mode === 'signup' ? name : null,
    return_to: returnTo,
    expires_at: expiresAt,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const baseUrl = getAppBaseUrl()
  const link = `${baseUrl}/auth/magic-link?token=${encodeURIComponent(token)}`

  const subject = mode === 'signup' ? 'Confirm your Hangout account' : 'Sign in to Hangout'
  const text = [
    mode === 'signup'
      ? `Hi ${name}, tap the link below to finish creating your Hangout account:`
      : 'Tap the link below to sign in to Hangout:',
    '',
    link,
    '',
    'This link expires in 15 minutes. If you did not request this, you can ignore this email.',
  ].join('\n')

  const html = `
    <p>${mode === 'signup' ? `Hi ${escapeHtml(name)},` : 'Hi,'}</p>
    <p>${mode === 'signup' ? 'Tap below to finish creating your Hangout account:' : 'Tap below to sign in to Hangout:'}</p>
    <p><a href="${escapeHtml(link)}">Sign in to Hangout</a></p>
    <p style="color:#71717a;font-size:14px;">This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
  `

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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
