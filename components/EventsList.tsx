'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { EventWithRSVPs } from '@/types/database'
import PlacesInput from '@/components/PlacesInput'

type TravelTimes = { car: number | null; transit: number | null; walk: number | null }

function formatTravel(minutes: number | null) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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

function EventCard({ event, token, viewerTravel, onRsvp, onDelete, onUpdate }: {
  event: EventWithRSVPs
  token: string | null
  viewerTravel: TravelTimes | null
  onRsvp: (id: string, status: string) => void
  onDelete: (id: string) => void
  onUpdate: (event: EventWithRSVPs) => void
}) {
  const { user } = useUser()
  const isOwner = !!user && (event.created_by === null || user.id === event.created_by)
  const isPast = event.scheduled_at && new Date(event.scheduled_at) < new Date()
  const hasRsvps = event.rsvp_yes > 0 || event.rsvp_maybe > 0 || event.rsvp_no > 0

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(event.title)
  const [editDesc, setEditDesc] = useState(event.description ?? '')
  const [editScheduled, setEditScheduled] = useState(event.scheduled_at ? toDatetimeLocal(event.scheduled_at) : '')
  const [editEnd, setEditEnd] = useState(event.end_time ? toDatetimeLocal(event.end_time) : '')
  const [editLocation, setEditLocation] = useState(event.location ?? '')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const startEdit = () => {
    setEditTitle(event.title)
    setEditDesc(event.description ?? '')
    setEditScheduled(event.scheduled_at ? toDatetimeLocal(event.scheduled_at) : '')
    setEditEnd(event.end_time ? toDatetimeLocal(event.end_time) : '')
    setEditLocation(event.location ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!token || !editTitle.trim()) return
    setSaving(true)
    setEditError('')
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({
        title: editTitle,
        description: editDesc,
        scheduled_at: editScheduled || null,
        end_time: editEnd || null,
        location: editLocation || null,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate({ ...event, ...updated })
      setEditing(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setEditError(data.error ?? 'Failed to save.')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!token) return
    setDeleting(true)
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { 'x-user-token': token },
    })
    if (res.ok) onDelete(event.id)
    else setDeleting(false)
  }

  if (editing) {
    return (
      <div className="p-4 rounded-xl border border-indigo-700 bg-zinc-900 space-y-2">
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Title"
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <PlacesInput
          value={editLocation}
          onChange={setEditLocation}
          placeholder="Location (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Start time</label>
          <input
            type="datetime-local"
            value={editScheduled}
            onChange={e => setEditScheduled(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">End time (optional)</label>
          <input
            type="datetime-local"
            value={editEnd}
            onChange={e => setEditEnd(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {editError && <p className="text-xs text-red-400">{editError}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={saveEdit}
            disabled={saving || !editTitle.trim()}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 ${isPast ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-100 text-base leading-tight">{event.title}</h3>
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={startEdit}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800 touch-manipulation"
                title="Edit"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                  <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H2v-3L11.5 2.5z" />
                </svg>
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs px-2 py-1 rounded-lg bg-red-900 text-red-300 hover:bg-red-800 touch-manipulation"
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 touch-manipulation"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800 touch-manipulation"
                  title="Delete"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-zinc-500">{event.description}</p>
        )}

        {event.scheduled_at ? (
          <div className="text-sm font-medium text-indigo-400">
            {formatDate(event.scheduled_at)}
            <span className="text-zinc-400 font-normal ml-1">
              · {formatTime(event.scheduled_at)}
              {event.end_time && ` – ${formatTime(event.end_time)}`}
            </span>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Time TBD</p>
        )}

        {event.location && <LocationLink location={event.location} />}

        {event.location && token && (() => {
          if (!user?.home_location) {
            return (
              <a href="/profile" className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
                Set home location for commute estimate →
              </a>
            )
          }
          if (!viewerTravel) return null  // still loading
          const car = formatTravel(viewerTravel.car)
          const transit = formatTravel(viewerTravel.transit)
          const walk = formatTravel(viewerTravel.walk)
          if (!car && !transit && !walk) return null
          return (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="text-xs text-zinc-600">Your commute:</span>
              {walk && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚶</span><span>{walk}</span></span>}
              {transit && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚌</span><span>{transit}</span></span>}
              {car && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚗</span><span>{car}</span></span>}
            </div>
          )
        })()}
      </div>

      {hasRsvps && (
        <div className="border-t border-zinc-800 pt-3 space-y-1.5">
          <RSVPNames names={event.rsvp_yes_names} label="Going" color="text-emerald-400" />
          <RSVPNames names={event.rsvp_maybe_names} label="Maybe" color="text-amber-400" />
          <RSVPNames names={event.rsvp_no_names} label="Can't" color="text-zinc-500" />
        </div>
      )}

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
  const { token, user } = useUser()
  const [events, setEvents] = useState<EventWithRSVPs[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [viewerTravelMap, setViewerTravelMap] = useState<Record<string, TravelTimes>>({})

  const fetchViewerTravel = async (loadedEvents: EventWithRSVPs[], origin: string) => {
    const withLoc = loadedEvents.filter(e => e.location)
    if (!withLoc.length) return
    const res = await fetch('/api/travel-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinations: withLoc.map(e => e.location!) }),
    })
    if (!res.ok) return
    const times: TravelTimes[] = await res.json()
    const map: Record<string, TravelTimes> = {}
    withLoc.forEach((e, i) => { map[e.id] = times[i] })
    setViewerTravelMap(map)
  }

  const fetchEvents = () => {
    fetch('/api/events', { headers: token ? { 'x-user-token': token } : {} })
      .then(r => r.json())
      .then(data => {
        const loaded = Array.isArray(data) ? data : []
        setEvents(loaded)
        if (user?.home_location) fetchViewerTravel(loaded, user.home_location)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [token])

  // Re-fetch travel times if user's home location loads after events
  useEffect(() => {
    if (user?.home_location && events.length > 0) {
      fetchViewerTravel(events, user.home_location)
    }
  }, [user?.home_location])

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

  const cardProps = (e: EventWithRSVPs) => ({
    event: e,
    token,
    viewerTravel: viewerTravelMap[e.id] ?? null,
    onRsvp: handleRsvp,
    onDelete: (id: string) => setEvents(prev => prev.filter(ev => ev.id !== id)),
    onUpdate: (updated: EventWithRSVPs) => setEvents(prev => prev.map(ev => ev.id === updated.id ? { ...ev, ...updated } : ev)),
  })

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map(e => <EventCard key={e.id} {...cardProps(e)} />)}
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
              {past.map(e => <EventCard key={e.id} {...cardProps(e)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
