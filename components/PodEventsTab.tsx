'use client'

import { useEffect, useState } from 'react'

type Event = {
  id: string
  title: string
  scheduled_at: string
  end_time: string | null
  location: string | null
  recurrence_rule: string | null
  recurrence_end: string | null
  source_idea_id: string | null
  rsvp_yes: number
  rsvp_maybe: number
  rsvp_no: number
  user_rsvp: 'yes' | 'maybe' | 'no' | null
  rsvp_yes_names: string[]
}

type Props = {
  podId: string
  token: string
  userId: string
  role: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function rruleLabel(rule: string | null) {
  if (!rule) return null
  if (rule.includes('INTERVAL=2')) return 'Biweekly'
  if (rule.startsWith('FREQ=WEEKLY')) return 'Weekly'
  if (rule.startsWith('FREQ=MONTHLY')) return 'Monthly'
  return 'Recurring'
}

export default function PodEventsTab({ podId, token, userId, role }: Props) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rsvping, setRsvping] = useState<string | null>(null)

  const fetchEvents = () => {
    fetch(`/api/pods/${podId}/events`, { headers: { 'x-user-token': token } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [podId, token])

  const handleRsvp = async (eventId: string, status: 'yes' | 'no') => {
    setRsvping(eventId)
    await fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ status }),
    })
    fetchEvents()
    setRsvping(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSubmitting(true)
    const res = await fetch(`/api/pods/${podId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ title: title.trim(), scheduled_at: `${date}T${time}:00`, location: location || null }),
    })
    if (res.ok) {
      setTitle(''); setDate(''); setTime('18:00'); setLocation('')
      setShowForm(false)
      fetchEvents()
    }
    setSubmitting(false)
  }

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.scheduled_at) >= now)
  const past = events.filter(e => new Date(e.scheduled_at) < now)

  const EventCard = ({ event }: { event: Event }) => {
    const label = rruleLabel(event.recurrence_rule)

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-zinc-100">{event.title}</p>
            {label && (
              <span className="text-[10px] bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-full">{label}</span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {formatDate(event.scheduled_at)} · {formatTime(event.scheduled_at)}
            {event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
          </p>
          {event.location && <p className="text-xs text-zinc-500">{event.location}</p>}
          {event.rsvp_yes > 0 && (
            <p className="text-[10px] text-zinc-600 mt-1">
              {event.rsvp_yes} going{event.rsvp_yes_names.length ? ` · ${event.rsvp_yes_names.join(', ')}` : ''}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleRsvp(event.id, 'yes')}
            disabled={rsvping === event.id}
            className={`px-3 py-1 text-xs rounded-lg transition-colors touch-manipulation ${
              event.user_rsvp === 'yes'
                ? 'bg-teal-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Going
          </button>
          <button
            onClick={() => handleRsvp(event.id, 'no')}
            disabled={rsvping === event.id}
            className={`px-3 py-1 text-xs rounded-lg transition-colors touch-manipulation ${
              event.user_rsvp === 'no'
                ? 'bg-red-800 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Can&apos;t go
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add event
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event name"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim() || !date} className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors">
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {upcoming.length === 0 && past.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No events yet — add one above!</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              {upcoming.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider pt-2">Past</p>
              {past.slice(-5).reverse().map(e => (
                <div key={e.id} className="opacity-50">
                  <EventCard event={e} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
