type SendEmailParams = {
  to: string
  subject: string
  html: string
  text: string
}

/** Sends via Resend REST API when RESEND_API_KEY is set; otherwise logs (dev). */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; devLink?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'Hangout <onboarding@resend.dev>'

  if (!apiKey) {
    console.info('[sendEmail] RESEND_API_KEY not set — email not sent:', params.subject, '→', params.to)
    return { sent: false }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Email send failed (${res.status}): ${body}`)
  }

  return { sent: true }
}
