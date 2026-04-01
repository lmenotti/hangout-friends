'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { IdeaWithVotes } from '@/types/database'

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

function IdeaCard({ idea, token, onVote, onSchedule, scheduling }: {
  idea: IdeaWithVotes
  token: string | null
  onVote: (id: string) => void
  onSchedule?: (idea: IdeaWithVotes) => void
  scheduling?: boolean
}) {
  const carTime = formatTravel(idea.travel_car_minutes)
  const transitTime = formatTravel(idea.travel_transit_minutes)
  const canSchedule = idea.vote_count >= 2

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
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
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-100 leading-snug">{idea.title}</p>
          {idea.is_outdoor != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
              idea.is_outdoor ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {idea.is_outdoor ? '☀ Outdoor' : '🏠 Indoor'}
            </span>
          )}
        </div>

        {idea.description && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{idea.description}</p>
        )}

        {/* Meta: duration + location */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {idea.duration_minutes && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <span>⏱</span>
              <span>{formatDuration(idea.duration_minutes)}</span>
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

        {/* Travel time from Berkeley */}
        {(carTime || transitTime) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-zinc-600">From Berkeley:</span>
            {carTime && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚗</span><span>{carTime}</span></span>}
            {transitTime && <span className="flex items-center gap-1 text-xs text-zinc-500"><span>🚌</span><span>{transitTime}</span></span>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 mt-1.5">
          <p className="text-xs text-zinc-600">by {idea.creator_name}</p>
          {idea.voter_names.length > 0 && (
            <p className="text-xs text-zinc-700" title={`Voted by: ${idea.voter_names.join(', ')}`}>
              · {idea.voter_names.join(', ')} voted
            </p>
          )}
        </div>
      </div>

      {/* Auto-schedule button — visible on any idea with 2+ votes */}
      {onSchedule && (
        <button
          onClick={() => canSchedule && onSchedule(idea)}
          disabled={!canSchedule || scheduling}
          title={!canSchedule ? 'Needs 2+ upvotes to auto-schedule' : 'Auto-schedule this idea'}
          className={`shrink-0 self-center px-3 py-2.5 text-xs font-medium rounded-xl transition-all touch-manipulation min-h-[40px] border ${
            canSchedule && !scheduling
              ? 'bg-zinc-800 hover:bg-indigo-600 active:bg-indigo-700 text-zinc-400 hover:text-white border-zinc-700 hover:border-indigo-600'
              : 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed'
          }`}
        >
          {scheduling ? '…' : 'Schedule'}
        </button>
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
  const [submitting, setSubmitting] = useState(false)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleMsg, setScheduleMsg] = useState('')

  const fetchIdeas = () => {
    fetch('/api/ideas', { headers: token ? { 'x-user-token': token } : {} })
      .then(r => r.json())
      .then(data => setIdeas(Array.isArray(data) ? data.sort((a, b) => b.vote_count - a.vote_count) : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchIdeas() }, [token])

  const handleVote = async (id: string) => {
    if (!token) return
    // Optimistic update
    setIdeas(prev => prev.map(idea => {
      if (idea.id !== id) return idea
      const nowVoted = !idea.user_voted
      return {
        ...idea,
        user_voted: nowVoted,
        vote_count: nowVoted ? idea.vote_count + 1 : idea.vote_count - 1,
      }
    }))
    await fetch(`/api/ideas/${id}/vote`, { method: 'POST', headers: { 'x-user-token': token } })
    fetchIdeas()
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
        title,
        description,
        location: location || null,
        duration_minutes,
        is_outdoor: isOutdoor,
      }),
    })
    setTitle('')
    setDescription('')
    setLocation('')
    setDurationHours('')
    setIsOutdoor(false)
    fetchIdeas()
    setSubmitting(false)
  }

  const handleSchedule = async (idea: IdeaWithVotes) => {
    if (!token) return
    setSchedulingId(idea.id)
    setScheduleMsg('')
    const res = await fetch('/api/auto-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ idea_id: idea.id }),
    })
    const data = await res.json()
    setScheduleMsg(res.ok ? `✓ ${data.message}` : data.error)
    setSchedulingId(null)
  }

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-3">
      {/* Add idea form */}
      {user && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 space-y-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Suggest something to do…"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            maxLength={100}
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Details (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (optional) — travel time from Berkeley will be estimated"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Duration (hours) *</label>
              <input
                type="number"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                placeholder="e.g. 2 or 1.5"
                required
                min="0.25"
                max="72"
                step="0.25"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsOutdoor(v => !v)}
              className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation border ${
                isOutdoor
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              {isOutdoor ? '☀ Outdoor' : '🏠 Indoor'}
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !durationHours}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-base font-medium rounded-xl transition-colors touch-manipulation"
          >
            {submitting ? 'Adding…' : 'Add idea'}
          </button>
        </form>
      )}

      {/* Schedule message */}
      {scheduleMsg && (
        <div className={`text-xs px-3 py-2.5 rounded-lg border ${
          scheduleMsg.startsWith('✓')
            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900'
            : 'bg-red-950/50 text-red-400 border-red-900'
        }`}>
          {scheduleMsg}
        </div>
      )}

      {/* Ideas list */}
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
              onVote={handleVote}
              onSchedule={showSchedule ? handleSchedule : undefined}
              scheduling={schedulingId === idea.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
