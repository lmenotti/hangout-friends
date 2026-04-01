import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PIN = (process.env.ADMIN_PIN ?? '1234').trim()

export async function POST(req: NextRequest) {
  if ((req.headers.get('x-admin-pin') ?? '').trim() !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on this server.' }, { status: 500 })
  }

  const { title, description } = await req.json()
  if (!title) return NextResponse.json({ error: 'Missing report title' }, { status: 400 })

  const prompt = `You are reviewing a bug report for a group scheduling web app called "Hangout" built with Next.js 16 App Router, TypeScript, Tailwind CSS, and Supabase.

Bug report:
Title: ${title}
Description: ${description ?? '(no description provided)'}

Briefly explain:
1. What is likely causing this issue
2. What specific code change would fix it (be concise and concrete — file paths and logic, not full code blocks)
3. Any caveats or things to check first

Keep your response under 200 words.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 })
  }

  const data = await res.json()
  const suggestion = data.content?.[0]?.text ?? 'No response from Claude.'
  return NextResponse.json({ suggestion })
}
