'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'

type Event = {
  id: string
  title: string
  scheduled_at: string
  end_time: string | null
  location: string | null
  description: string | null
  recurrence_rule: string | null
  pod_id: string
  rsvps: { user_id: string; status: string }[]
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function rruleLabel(rule: string | null) {
  if (!rule) return null
  if (rule.includes('INTERVAL=2')) return 'Repeats biweekly'
  if (rule.startsWith('FREQ=WEEKLY')) return 'Repeats weekly'
  if (rule.startsWith('FREQ=MONTHLY')) return 'Repeats monthly'
  return 'Recurring'
}

export default function EventPageClient({ podId, eventId }: { podId: string; eventId: string }) {
  const { user, token } = useUser()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [rsvping, setRsvping] = useState(false)

  const fetchEvent = () => {
    fetch(`/api/events/${eventId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setEvent(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvent() }, [eventId])

  const handleRsvp = async (status: 'yes' | 'no') => {
    if (!token) return
    setRsvping(true)
    await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ status }),
    })
    fetchEvent()
    setRsvping(false)
  }

  if (loading) return <div className="h-64 rounded-xl bg-zinc-800/50 animate-pulse" />
  if (!event) return <p className="text-zinc-500">Event not found.</p>

  const myRsvp = event.rsvps?.find(r => r.user_id === user?.id)
  const goingCount = event.rsvps?.filter(r => r.status === 'yes').length ?? 0
  const label = rruleLabel(event.recurrence_rule)

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href={`/pods/${podId}`} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← Back to pod</Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-semibold text-zinc-100">{event.title}</h1>
            {label && (
              <span className="text-xs bg-indigo-900/50 text-indigo-400 px-2.5 py-0.5 rounded-full">{label}</span>
            )}
          </div>

          <p className="text-sm text-zinc-400">
            {formatDateTime(event.scheduled_at)}
            {event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
          </p>
          {event.location && <p className="text-sm text-zinc-500 mt-0.5">{event.location}</p>}
          {event.description && <p className="text-sm text-zinc-400 mt-2">{event.description}</p>}
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-xs text-zinc-600">{goingCount} going</p>

          {user ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleRsvp('yes')}
                disabled={rsvping}
                className={`px-5 py-2 text-sm font-medium rounded-xl transition-colors touch-manipulation ${
                  myRsvp?.status === 'yes'
                    ? 'bg-teal-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Going
              </button>
              <button
                onClick={() => handleRsvp('no')}
                disabled={rsvping}
                className={`px-5 py-2 text-sm font-medium rounded-xl transition-colors touch-manipulation ${
                  myRsvp?.status === 'no'
                    ? 'bg-red-800 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Can&apos;t go
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Sign in to RSVP.</p>
          )}
        </div>
      </div>
    </div>
  )
}
