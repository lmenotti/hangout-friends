'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { Suspense } from 'react'

function JoinForm() {
  const { user, token, showSignIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-zinc-400 text-sm">Sign in to join a pod.</p>
        <button onClick={showSignIn} className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
          Sign in
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/pods/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token! },
      body: JSON.stringify({ invite_code: code.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    router.push(`/pods/${data.id}`)
  }

  return (
    <div className="max-w-sm space-y-6">
      <div>
        <Link href="/pods" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← Pods</Link>
        <h1 className="text-xl font-semibold text-zinc-100 mt-2">Join a pod</h1>
        <p className="text-sm text-zinc-500 mt-1">Enter the invite code shared with you.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Invite code (e.g. AB12CD)"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono tracking-widest uppercase"
          maxLength={8}
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors touch-manipulation"
        >
          {submitting ? 'Joining…' : 'Join pod'}
        </button>
      </form>
    </div>
  )
}

export default function JoinPodPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  )
}
