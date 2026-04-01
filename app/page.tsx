'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import EventsList from '@/components/EventsList'
import AvailabilityGrid from '@/components/AvailabilityGrid'

function Dashboard() {
  const { user } = useUser()
  return (
    <div className="space-y-10">
      <div>
        <p className="text-zinc-500 text-sm mb-0.5">Welcome back</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{user?.name}</h1>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Upcoming</h2>
          <Link href="/events" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            All events →
          </Link>
        </div>
        <EventsList />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Availability</h2>
          <Link href="/availability" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Full view →
          </Link>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <AvailabilityGrid />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/ideas" className="group flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
          <div>
            <p className="text-sm font-medium text-zinc-200">Ideas</p>
            <p className="text-xs text-zinc-500 mt-0.5">Vote on what to do</p>
          </div>
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">→</span>
        </Link>
        <Link href="/events" className="group flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
          <div>
            <p className="text-sm font-medium text-zinc-200">Events</p>
            <p className="text-xs text-zinc-500 mt-0.5">RSVP and manage</p>
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
          Stop fighting group chats. One place to coordinate when to hang, what to do, and who&apos;s in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
        {[
          { emoji: '🗓️', title: 'Availability', desc: 'Mark your free hours. See the group overlap.' },
          { emoji: '💡', title: 'Ideas & voting', desc: 'Suggest plans. Vote on what sounds good.' },
          { emoji: '✨', title: 'Auto-schedule', desc: 'One click picks the time that works for most.' },
          { emoji: '📅', title: 'RSVP', desc: 'Know exactly who\'s coming to each event.' },
        ].map(card => (
          <div key={card.title} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
            <span className="text-xl">{card.emoji}</span>
            <p className="text-sm font-medium text-zinc-200 mt-2">{card.title}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-zinc-600 max-w-sm">
        Share this URL with your friends — everyone joins the same group automatically. No accounts needed.
      </p>
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
        <div className="h-64 bg-zinc-800/50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return user ? <Dashboard /> : <Landing />
}

