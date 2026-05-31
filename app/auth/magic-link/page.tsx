'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'

function MagicLinkVerify() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, setUser } = useUser()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      router.replace(searchParams.get('returnTo') ?? '/profile')
      return
    }

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setError('Missing sign-in token. Request a new link from the sign-in page.')
      return
    }

    const controller = new AbortController()

    fetch('/api/auth/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Sign-in failed')
        setUser(data, data.token)
        router.replace(typeof data.returnTo === 'string' ? data.returnTo : '/profile')
      })
      .catch(err => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Sign-in failed')
      })

    return () => controller.abort()
  }, [user, searchParams, router, setUser])

  if (status === 'error') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <Link
          href="/auth/signin"
          className="inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-sm text-zinc-400">Signing you in…</p>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-zinc-100">Magic link</h1>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <Suspense fallback={<div className="h-16 rounded-xl bg-zinc-800/50 animate-pulse" />}>
            <MagicLinkVerify />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
