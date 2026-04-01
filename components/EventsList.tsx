'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { EventWithRSVPs } from '@/types/database'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

function LocationLink({ location }: { location: string }) {
  const isUrl = /^https?:\/\//i.test(location)
  const href = isUrl ? location : `https://maps.google.com/?q=${encodeURIComponent(location)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      <span>📍</span>
      <span className="underline underline-offset-2">{isUrl ? 'View on Maps' : location}</span>
    </a>
  )
}

function RSVPNames({ names, label, color }: { names: string[]; label: string; color: string }) {
  if (names.length === 0) return null
  return (
    <div className="flex items-start gap-2">
      <span className={`text-xs font-medium shrink-0 mt-0.5 ${color}`}>{label}</span>
      <span className="text-xs text-zinc-400">{names.join(', ')}</span>
    </div>
  )
}

function EventCard({ event, token, onRsvp }: {
  event: EventWithRSVPs
  token: string | null
  onRsvp: (id: string, status: string) => void
}) {
  const isPast = event.scheduled_at && new Date(event.scheduled_at) < new Date()
  const hasRsvps = event.rsvp_yes > 0 || event.rsvp_maybe > 0 || event.rsvp_no > 0

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 ${isPast ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="space-y-1.5">
        <h3 className="font-semibold text-zinc-100 text-base leading-tight">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-zinc-500">{event.description}</p>
        )}

        {/* Date / time */}
        {event.scheduled_at ? (
          <div className="text-sm font-medium text-indigo-400">
            {formatDate(event.scheduled_at)}
            {(event.scheduled_at || event.end_time) && (
              <span className="text-zinc-400 font-normal ml-1">
                · {formatTime(event.scheduled_at)}
                {event.end_time && ` – ${formatTime(event.end_time)}`}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Time TBD</p>
        )}

        {/* Location */}
        {event.location && <LocationLink location={event.location} />}
      </div>

      {/* RSVP counts + names */}
      {hasRsvps && (
        <div className="border-t border-zinc-800 pt-3 space-y-1.5">
          <RSVPNames names={event.rsvp_yes_names} label="Going" color="text-emerald-400" />
          <RSVPNames names={event.rsvp_maybe_names} label="Maybe" color="text-amber-400" />
          <RSVPNames names={event.rsvp_no_names} label="Can't" color="text-zinc-500" />
        </div>
      )}

      {/* RSVP buttons */}
      {token && (
        <div className="flex gap-2 pt-1">
          {([
            { value: 'yes', label: "I'm in", active: 'bg-emerald-600 text-white' },
            { value: 'maybe', label: 'Maybe', active: 'bg-amber-500 text-white' },
            { value: 'no', label: "Can't", active: 'bg-zinc-600 text-zinc-300' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => onRsvp(event.id, opt.value)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                event.user_rsvp === opt.value
                  ? opt.active
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EventsList({ upcomingOnly = false }: { upcomingOnly?: boolean }) {
  const { token } = useUser()
  const [events, setEvents] = useState<EventWithRSVPs[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  const fetchEvents = () => {
    fetch('/api/events', { headers: token ? { 'x-user-token': token } : {} })
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [token])

  const handleRsvp = async (eventId: string, status: string) => {
    if (!token) return
    await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ status }),
    })
    fetchEvents()
  }

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  const now = new Date()
  const upcoming = events.filter(e => !e.scheduled_at || new Date(e.scheduled_at) >= now)
  const past = events.filter(e => e.scheduled_at && new Date(e.scheduled_at) < now)

  if (events.length === 0 || (upcomingOnly && upcoming.length === 0)) {
    return (
      <div className="text-center py-10 text-zinc-600">
        <p className="text-2xl mb-2">📅</p>
        <p className="text-sm">No upcoming events.</p>
        <p className="text-xs mt-1 text-zinc-700">Auto-schedule from the Ideas tab or create one manually.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map(e => <EventCard key={e.id} event={e} token={token} onRsvp={handleRsvp} />)}
        </div>
      )}
      {!upcomingOnly && past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(v => !v)}
            className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors mb-3 touch-manipulation"
          >
            <span>{showPast ? '▾' : '▸'}</span>
            <span>Past ({past.length})</span>
          </button>
          {showPast && (
            <div className="space-y-3">
              {past.map(e => <EventCard key={e.id} event={e} token={token} onRsvp={handleRsvp} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
