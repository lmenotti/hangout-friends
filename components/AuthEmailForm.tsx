'use client'

import { useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function AuthEmailForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/profile'

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setDevLink(null)

    try {
      const res = await fetch('/api/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      setSent(true)
      setMessage(data.message ?? 'Check your email for a sign-in link.')
      if (data.devLink) setDevLink(data.devLink)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-300">{message}</p>
        <p className="text-xs text-zinc-500">The link expires in 15 minutes.</p>
        {devLink && (
          <p className="text-xs text-amber-400/90 break-all">
            Dev: <a href={devLink} className="underline">{devLink}</a>
          </p>
        )}
        <button
          type="button"
          onClick={() => { setSent(false); setEmail('') }}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors touch-manipulation"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@school.edu"
        autoComplete="email"
        inputMode="email"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        required
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-base font-medium py-3.5 rounded-xl transition-colors touch-manipulation"
      >
        {submitting ? 'Sending…' : 'Email me a sign-in link'}
      </button>

      <p className="text-center text-xs text-zinc-600">
        New here? We&apos;ll create an account when you use the link.
      </p>
    </form>
  )
}
