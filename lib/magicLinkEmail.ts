import { getAppBaseUrl } from '@/lib/appUrl'

type MagicLinkEmailParams = {
  link: string
}

/** Branded transactional email for unified magic-link sign-in (new + returning users). */
export function buildMagicLinkEmail({ link }: MagicLinkEmailParams) {
  const subject = 'Sign in to Hangout'
  const intro = 'Tap the button below to sign in to Hangout. New here? We\u2019ll create your account when you use the link.'

  const text = [
    'Hi,',
    '',
    intro,
    '',
    link,
    '',
    'This link expires in 15 minutes. If you did not request this, you can ignore this email.',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:400px;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px 24px;">
        <tr><td style="color:#fafafa;font-size:18px;font-weight:600;padding-bottom:8px;">hangout</td></tr>
        <tr><td style="color:#a1a1aa;font-size:14px;line-height:1.5;padding-bottom:24px;">Hi, ${escapeHtml(intro)}</td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:15px;font-weight:500;padding:14px 28px;border-radius:12px;">Sign in to Hangout</a>
        </td></tr>
        <tr><td style="color:#52525b;font-size:12px;line-height:1.5;">This link expires in 15 minutes. If you did not request this, you can ignore this email.</td></tr>
        <tr><td style="color:#3f3f46;font-size:11px;line-height:1.5;padding-top:16px;word-break:break-all;">${escapeHtml(link)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  return { subject, html, text }
}

export function buildMagicLinkUrl(token: string, returnTo?: string): string {
  const base = getAppBaseUrl()
  const params = new URLSearchParams({ token })
  if (returnTo) params.set('returnTo', returnTo)
  return `${base}/auth/magic-link?${params.toString()}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
