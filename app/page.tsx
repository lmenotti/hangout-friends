'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'

function Dashboard() {
  const { user } = useUser()
  return (
    <div className="space-y-10">
      <div>
        <p className="text-zinc-500 text-sm mb-0.5">Welcome back</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{user?.name}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/polls/new"
          className="group flex items-center justify-between p-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:border-indigo-500/50 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-100">New plan</p>
            <p className="text-xs text-zinc-500 mt-0.5">Create a link to share in iMessage</p>
          </div>
          <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors">→</span>
        </Link>
        <Link
          href="/pods"
          className="group flex items-center justify-between p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-zinc-200">Pods</p>
            <p className="text-xs text-zinc-500 mt-0.5">Your recurring friend groups</p>
          </div>
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">→</span>
        </Link>
      </div>
    </div>
  )
}

function Landing() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-12">
      <div className="space-y-4 max-w-lg">
        <h1 className="text-5xl font-bold text-zinc-100 tracking-tight">hangout</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Drop a link in iMessage. Everyone marks when they&apos;re free — no account, no app download.
        </p>
      </div>

      <Link
        href="/polls/new"
        className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base transition-colors touch-manipulation min-h-[48px]"
      >
        Create a plan
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
        {[
          { emoji: '🔗', title: 'Share a link', desc: 'One URL in group chat. Everyone responds anonymously.' },
          { emoji: '🗓️', title: 'Mark availability', desc: 'Tap or drag on a mobile-friendly grid.' },
          { emoji: '💡', title: 'Vote on ideas', desc: 'Suggest activities. Upvote what sounds good.' },
          { emoji: '✨', title: 'Auto-schedule', desc: 'One click locks the best time and activity.' },
        ].map(card => (
          <div key={card.title} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
            <span className="text-xl">{card.emoji}</span>
            <p className="text-sm font-medium text-zinc-200 mt-2">{card.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="h-8 w-32 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-40 bg-zinc-800/50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return user ? <Dashboard /> : <Landing />
}
