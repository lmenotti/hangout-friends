'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { IdeaWithVotes } from '@/types/database'
import PlacesInput from '@/components/PlacesInput'

type TravelTimes = { car: number | null; transit: number | null; walk: number | null }

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatTravel(minutes: number | null) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatSuggested(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// datetime-local input requires "YYYY-MM-DDTHH:MM"
function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function IdeaCard({ idea, token, viewerTravel, viewerOrigin, onVote, onScheduled, onDelete, onSaved }: {
  idea: IdeaWithVotes
  token: string | null
  viewerTravel: TravelTimes | null
  viewerOrigin: string | null
  onVote: (id: string) => void
  onScheduled: (id: string) => void
  onDelete: (id: string) => void
  onSaved: () => void
}) {
  const { user } = useUser()
  const isOwner = !!user && user.id === idea.created_by

  // Use viewer's own travel times if available, fall back to stored (creator's) times
  const travel = viewerTravel ?? {
    car: idea.travel_car_minutes,
    transit: idea.travel_transit_minutes,
    walk: idea.travel_walk_minutes,
  }
  const travelLabel = viewerTravel
    ? `Your commute`
    : `From ${idea.travel_origin ?? 'Berkeley'}`

  const transitTime = formatTravel(travel.transit)
  const carTime = formatTravel(travel.car)
  const walkTime = formatTravel(travel.walk)
  const canSchedule = idea.vote_count >= 2

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(idea.title)
  const [editDesc, setEditDesc] = useState(idea.description ?? '')
  const [editDuration, setEditDuration] = useState(idea.duration_minutes ? String(idea.duration_minutes / 60) : '')
  const [editLocation, setEditLocation] = useState(idea.location ?? '')
  const [editOutdoor, setEditOutdoor] = useState(idea.is_outdoor ?? false)
  const [editSuggested, setEditSuggested] = useState(idea.suggested_at ? toDatetimeLocal(idea.suggested_at) : '')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Schedule panel state
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [manualDatetime, setManualDatetime] = useState(
    idea.suggested_at ? toDatetimeLocal(idea.suggested_at) : ''
  )
  const [scheduleError, setScheduleError] = useState('')

  const startEdit = () => {
    setEditTitle(idea.title)
    setEditDesc(idea.description ?? '')
    setEditDuration(idea.duration_minutes ? String(idea.duration_minutes / 60) : '')
    setEditLocation(idea.location ?? '')
    setEditOutdoor(idea.is_outdoor ?? false)
    setEditSuggested(idea.suggested_at ? toDatetimeLocal(idea.suggested_at) : '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!token || !editTitle.trim() || !editDuration) return
    setSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-token': token },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          duration_minutes: Math.round(parseFloat(editDuration) * 60),
          is_outdoor: editOutdoor,
          location: editLocation || null,
          suggested_at: editSuggested || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        onSaved()
      } else {
        const data = await res.json().catch(() => ({}))
        setEditError(data.error ?? 'Failed to save.')
      }
    } catch {
      setEditError('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token) return
    setDeleting(true)
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: 'DELETE',
      headers: { 'x-user-token': token },
    })
    if (res.ok) onDelete(idea.id)
    else setDeleting(false)
  }

  const handleAutoSchedule = async () => {
    if (!token) return
    setScheduling(true)
    setScheduleError('')
    const res = await fetch('/api/auto-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ idea_id: idea.id }),
    })
    const data = await res.json()
    if (res.ok) {
      onScheduled(idea.id)
    } else {
      setScheduleError(data.error)
      setScheduling(false)
    }
  }

  const handleManualSchedule = async () => {
    if (!token || !manualDatetime) return
    setScheduling(true)
    setScheduleError('')
    const scheduled_at = new Date(manualDatetime).toISOString()
    let end_time: string | null = null
    if (idea.duration_minutes) {
      const end = new Date(manualDatetime)
      end.setMinutes(end.getMinutes() + idea.duration_minutes)
      end_time = end.toISOString()
    }
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({
        title: idea.title,
        description: idea.description,
        location: idea.location,
        idea_id: idea.id,
        scheduled_at,
        end_time,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      onScheduled(idea.id)
    } else {
      setScheduleError(data.error)
      setScheduling(false)
    }
  }

  if (editing) {
    return (
      <div className="p-4 rounded-xl border border-indigo-700 bg-zinc-900 space-y-2">
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Title"
          required
          maxLength={100}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Details (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <PlacesInput
          value={editLocation}
          onChange={setEditLocation}
          placeholder="Location (optional)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 mb-1 block">Duration (hours)</label>
            <input
              type="number"
              value={editDuration}
              onChange={e => setEditDuration(e.target.value)}
              min="0.25" max="72" step="0.25"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditOutdoor(v => !v)}
            className={`shrink-0 self-end px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border touch-manipulation ${
              editOutdoor ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {editOutdoor ? '☀ Out' : '🏠 In'}
          </button>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Suggested time (optional)</label>
          <input
            type="datetime-local"
            value={editSuggested}
            onChange={e => setEditSuggested(e.target.value)}
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
            disabled={saving || !editTitle.trim() || !editDuration}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-3 p-4">
        {/* Vote button */}
        <button
          onClick={() => token && onVote(idea.id)}
          disabled={!token}
          className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-colors text-xs font-semibold touch-manipulation ${
            idea.user_voted
              ? 'bg-indigo-600 text-white active:bg-indigo-700'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:bg-zinc-700'
          } disabled:opacity-40`}
        >
          <span className="leading-none mb-0.5">▲</span>
          <span className="leading-none">{idea.vote_count}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="text-sm font-medium text-zinc-100 leading-snug">{idea.title}</p>
              {idea.is_outdoor != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                  idea.is_outdoor ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {idea.is_outdoor ? '☀ Outdoor' : '🏠 Indoor'}
                </span>
              )}
            </div>
            {/* Owner controls */}
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

          {idea.description && (
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{idea.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {idea.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <span>⏱</span><span>{formatDuration(idea.duration_minutes)}</span>
              </span>
            )}
            {idea.suggested_at && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <span>📅</span><span>{formatSuggested(idea.suggested_at)}</span>
              </span>
            )}
            {idea.location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(idea.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>📍</span>
                <span className="underline underline-offset-2 truncate max-w-[180px]">{idea.location}</span>
              </a>
            )}
          </div>

          {(transitTime || carTime || walkTime) ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-zinc-600">{travelLabel}:</span>
              {walkTime && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚶</span><span>{walkTime}</span></span>}
              {transitTime && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚌</span><span>{transitTime}</span></span>}
              {carTime && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚗</span><span>{carTime}</span></span>}
            </div>
          ) : (idea.location && token && !user?.home_location) ? (
            <a href="/profile" className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
              Set home location for commute estimate →
            </a>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 mt-1.5">
            <p className="text-xs text-zinc-600">by {idea.creator_name}</p>
            {idea.voter_names.length > 0 && (
              <p className="text-xs text-zinc-700" title={`Voted: ${idea.voter_names.join(', ')}`}>
                · {idea.voter_names.join(', ')} voted
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule panel */}
      {token && (
        <div className="border-t border-zinc-800 px-4 py-2.5">
          {!showSchedule ? (
            <button
              onClick={() => setShowSchedule(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors touch-manipulation"
            >
              Schedule →
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAutoSchedule}
                  disabled={!canSchedule || scheduling}
                  title={!canSchedule ? 'Needs 2+ votes to auto-schedule' : ''}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
                    canSchedule && !scheduling
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {scheduling ? '…' : 'Auto-schedule'}
                </button>
                <span className="text-xs text-zinc-600">or pick a time:</span>
                <button
                  onClick={() => setShowSchedule(false)}
                  className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 touch-manipulation"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={manualDatetime}
                  onChange={e => setManualDatetime(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleManualSchedule}
                  disabled={!manualDatetime || scheduling}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 transition-colors touch-manipulation"
                >
                  {scheduling ? '…' : 'Create event'}
                </button>
              </div>
              {scheduleError && (
                <p className="text-xs text-red-400">{scheduleError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function IdeasBoard({ showSchedule = false }: { showSchedule?: boolean }) {
  const { user, token } = useUser()
  const [ideas, setIdeas] = useState<IdeaWithVotes[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [isOutdoor, setIsOutdoor] = useState(false)
  const [suggestedAt, setSuggestedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Viewer-specific travel times, keyed by idea id
  const [viewerTravelMap, setViewerTravelMap] = useState<Record<string, TravelTimes>>({})
  // Schedule-all state
  const [schedulingAll, setSchedulingAll] = useState(false)
  const [scheduleAllResult, setScheduleAllResult] = useState<{
    scheduled: Array<{ idea_title: string; day: string; time: string; voters: number; weather?: string }>
    skipped: string[]
  } | null>(null)
  const [scheduleAllError, setScheduleAllError] = useState('')

  const fetchViewerTravel = async (loadedIdeas: IdeaWithVotes[], origin: string) => {
    const withLoc = loadedIdeas.filter(i => i.location)
    if (!withLoc.length) return
    const res = await fetch('/api/travel-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinations: withLoc.map(i => i.location!) }),
    })
    if (!res.ok) return
    const times: TravelTimes[] = await res.json()
    const map: Record<string, TravelTimes> = {}
    withLoc.forEach((idea, i) => {
      const t = times[i]
      if (t && (t.car !== null || t.transit !== null || t.walk !== null)) {
        map[idea.id] = t
      }
    })
    setViewerTravelMap(map)
  }

  const fetchIdeas = async () => {
    const res = await fetch('/api/ideas', { headers: token ? { 'x-user-token': token } : {} })
    const data = await res.json()
    const sorted: IdeaWithVotes[] = Array.isArray(data)
      ? data.sort((a: IdeaWithVotes, b: IdeaWithVotes) => b.vote_count - a.vote_count)
      : []
    setIdeas(sorted)
    setLoading(false)
    if (user?.home_location) await fetchViewerTravel(sorted, user.home_location)
  }

  useEffect(() => { fetchIdeas() }, [token])

  // Re-fetch travel times if user's home location loads after ideas
  useEffect(() => {
    if (user?.home_location && ideas.length > 0) {
      fetchViewerTravel(ideas, user.home_location)
    }
  }, [user?.home_location])

  const handleVote = async (id: string) => {
    if (!token) return
    setIdeas(prev => prev.map(idea => {
      if (idea.id !== id) return idea
      const nowVoted = !idea.user_voted
      return {
        ...idea,
        user_voted: nowVoted,
        vote_count: nowVoted ? idea.vote_count + 1 : idea.vote_count - 1,
        voter_names: nowVoted
          ? [...idea.voter_names, 'You']
          : idea.voter_names.filter(n => n !== 'You'),
      }
    }))
    fetch(`/api/ideas/${id}/vote`, { method: 'POST', headers: { 'x-user-token': token } })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !token || !durationHours) return
    setSubmitting(true)
    const duration_minutes = Math.round(parseFloat(durationHours) * 60)
    await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({
        title, description,
        location: location || null,
        duration_minutes,
        is_outdoor: isOutdoor,
        suggested_at: suggestedAt || null,
      }),
    })
    setTitle(''); setDescription(''); setLocation('')
    setDurationHours(''); setIsOutdoor(false); setSuggestedAt('')
    fetchIdeas()
    setSubmitting(false)
  }

  const handleScheduleAll = async () => {
    if (!token) return
    setSchedulingAll(true)
    setScheduleAllResult(null)
    setScheduleAllError('')
    try {
      const res = await fetch('/api/auto-schedule/all', {
        method: 'POST',
        headers: { 'x-user-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScheduleAllResult(data)
      fetchIdeas()
    } catch (err: any) {
      setScheduleAllError(err.message)
    } finally {
      setSchedulingAll(false)
    }
  }

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-3">
      {user && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 space-y-2">
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Suggest something to do…" required maxLength={100}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <input
            type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Details (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <PlacesInput
            value={location}
            onChange={setLocation}
            placeholder="Location (optional) — travel time will be estimated"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Duration (hours) *</label>
              <input
                type="number" value={durationHours} onChange={e => setDurationHours(e.target.value)}
                placeholder="e.g. 2 or 1.5" required min="0.25" max="72" step="0.25"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              type="button" onClick={() => setIsOutdoor(v => !v)}
              className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation border ${
                isOutdoor ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {isOutdoor ? '☀ Outdoor' : '🏠 Indoor'}
            </button>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Suggested time (optional)</label>
            <input
              type="datetime-local" value={suggestedAt} onChange={e => setSuggestedAt(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit" disabled={submitting || !title.trim() || !durationHours}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-base font-medium rounded-xl transition-colors touch-manipulation"
          >
            {submitting ? 'Adding…' : 'Add idea'}
          </button>
        </form>
      )}

      {/* Schedule all */}
      {token && ideas.filter(i => !i.is_scheduled).length >= 2 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Auto-schedule everything</p>
              <p className="text-xs text-zinc-500">Schedules all ideas with 2+ votes, highest-voted first.</p>
            </div>
            <button
              onClick={handleScheduleAll}
              disabled={schedulingAll}
              className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
            >
              {schedulingAll ? 'Scheduling…' : 'Schedule all'}
            </button>
          </div>
          {scheduleAllError && (
            <p className="text-xs text-red-400">{scheduleAllError}</p>
          )}
          {scheduleAllResult && (
            <div className="space-y-1.5 pt-1 border-t border-zinc-800">
              {scheduleAllResult.scheduled.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="text-emerald-400">✓</span>
                  <span className="font-medium truncate">{s.idea_title}</span>
                  <span className="text-zinc-500 shrink-0">{s.day} {s.time}</span>
                  {s.weather && <span className="shrink-0">{s.weather}</span>}
                </div>
              ))}
              {scheduleAllResult.skipped.map((title, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>—</span>
                  <span className="truncate">{title}</span>
                  <span className="shrink-0">no slot found</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ideas.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-2xl mb-2">💡</p>
          <p className="text-sm">No ideas yet — be the first to suggest something.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              token={token}
              viewerTravel={viewerTravelMap[idea.id] ?? null}
              viewerOrigin={user?.home_location ?? null}
              onVote={handleVote}
              onScheduled={id => setIdeas(prev => prev.filter(i => i.id !== id))}
              onDelete={id => setIdeas(prev => prev.filter(i => i.id !== id))}
              onSaved={fetchIdeas}
            />
          ))}
        </div>
      )}
    </div>
  )
}
