'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

type MinPoll = {
  id: string
  slug: string
  title: string
  status: string
  date_options: string[]
  creator_name: string
  created_at: string
  scheduled_at: string | null
}

function formatDateRange(dates: string[]): string {
  if (!dates.length) return ''
  const sorted = [...dates].sort()
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return sorted.length === 1
    ? fmt(sorted[0])
    : `${fmt(sorted[0])} – ${fmt(sorted[sorted.length - 1])}`
}

function PlanCard({ plan }: { plan: MinPoll }) {
  return (
    <Link
      href={`/p/${plan.slug}`}
      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
            {plan.title}
          </span>
          {plan.status === 'scheduled' && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
              Scheduled
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{formatDateRange(plan.date_options)}</p>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 ml-3 transition-colors"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  )
}

function YourPlans({ token }: { token: string | null }) {
  const [plans, setPlans] = useState<{ created: MinPoll[]; on_device: MinPoll[] } | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = {}
    if (token) headers['x-user-token'] = token
    fetch('/api/polls/mine', { headers, credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(setPlans)
      .catch(() => {})
  }, [token])

  if (!plans) {
    return <div className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />
  }

  const all = [...plans.created, ...plans.on_device]
  if (all.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
        <p className="text-zinc-500 text-sm">No plans yet.</p>
        <Link
          href="/polls/new"
          className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Create your first plan →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {all.map(plan => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  )
}

function Dashboard() {
  const { user, token } = useUser()
  return (
    <div className="space-y-8">
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

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Your plans</h2>
        <YourPlans token={token} />
      </div>
    </div>
  )
}

function Landing() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('hangout_home_stay') === '1') return

    const goToPlan = (slug: string) => {
      setRedirecting(true)
      router.replace(`/p/${slug}`)
    }

    Promise.all([
      fetch('/api/polls/mine', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
      fetch('/api/polls/last', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([mine, last]: [{ created: MinPoll[]; on_device: MinPoll[] } | null, { slug: string | null } | null]) => {
        if (!mine && !last?.slug) return
        const all = mine ? [...mine.created, ...mine.on_device] : []
        if (all.length === 1) {
          goToPlan(all[0].slug)
          return
        }
        if (last?.slug) {
          goToPlan(last.slug)
        }
      })
      .catch(() => {})
  }, [router])

  if (redirecting) {
    return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse mt-4" />
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 py-16 space-y-10 max-w-lg mx-auto w-full">
      <div className="space-y-4 text-center w-full">
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

      <div id="your-plans" className="w-full space-y-3 text-left">
        <h2 className="text-sm font-medium text-zinc-400">My plans on this device</h2>
        <YourPlans token={null} />
        <button
          type="button"
          onClick={() => sessionStorage.setItem('hangout_home_stay', '1')}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Stay on home instead of auto-opening my plan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
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
