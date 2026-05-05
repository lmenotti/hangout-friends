'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'

type Pod = { id: string; name: string; invite_code: string; member_count: number; role: string; created_at: string }

export default function PodsPage() {
  const { user, token, showSignIn } = useUser()
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/pods', { headers: { 'x-user-token': token } })
      .then(r => r.ok ? r.json() : [])
      .then(setPods)
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-zinc-400 text-sm">Sign in to view and create pods.</p>
        <button onClick={showSignIn} className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Pods</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your friend groups.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pods/join"
            className="px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors touch-manipulation"
          >
            Join
          </Link>
          <Link
            href="/pods/new"
            className="px-3 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors touch-manipulation"
          >
            + New pod
          </Link>
        </div>
      </div>

      {pods.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <p className="text-zinc-400 text-sm">You&apos;re not in any pods yet.</p>
          <div className="flex gap-2 justify-center">
            <Link href="/pods/new" className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              Create one
            </Link>
            <Link href="/pods/join" className="px-4 py-2 text-sm rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              Join with code
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {pods.map(pod => (
            <Link
              key={pod.id}
              href={`/pods/${pod.id}`}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">{pod.name}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {pod.member_count} member{pod.member_count !== 1 ? 's' : ''} · {pod.role === 'owner' ? 'Owner' : 'Member'}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1 text-xs font-mono text-zinc-400">
                {pod.invite_code}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
