'use client'

import { useState } from 'react'
import PlacesInput from '@/components/PlacesInput'

export type PollIdea = {
  id: string
  title: string
  description: string | null
  location: string | null
  duration_minutes: number | null
  is_outdoor: boolean | null
  created_by_name: string | null
  vote_count: number
  voter_names: string[]
}

type Props = {
  pollId: string
  name: string
  ideas: PollIdea[]
  disabled: boolean
  onIdeasChange: () => void
  onNeedName: () => void
}

const DURATION_PRESETS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: 'Half day', value: 240 },
]

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function PollIdeasBoard({
  pollId,
  name,
  ideas,
  disabled,
  onIdeasChange,
  onNeedName,
}: Props) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [showDetails, setShowDetails] = useState(false)
  const [isOutdoor, setIsOutdoor] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [customDuration, setCustomDuration] = useState('')

  const [expandedVoters, setExpandedVoters] = useState<Set<string>>(new Set())

  const addIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!name.trim()) {
      onNeedName()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/polls/${pollId}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim() || null,
          duration_minutes: durationMinutes,
          is_outdoor: isOutdoor,
          created_by_name: name.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTitle('')
      setLocation('')
      setIsOutdoor(false)
      setDurationMinutes(null)
      setCustomDuration('')
      setShowDetails(false)
      onIdeasChange()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add idea')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleVote = async (ideaId: string) => {
    if (!name.trim()) {
      onNeedName()
      return
    }
    const res = await fetch(`/api/polls/${pollId}/ideas/${ideaId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respondent_name: name.trim() }),
    })
    if (res.ok) onIdeasChange()
  }

  const toggleVoterExpand = (id: string) => {
    setExpandedVoters(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCustomDuration = (val: string) => {
    setCustomDuration(val)
    const n = parseInt(val, 10)
    setDurationMinutes(!isNaN(n) && n > 0 ? n : null)
  }

  const nameLower = name.trim().toLowerCase()

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-zinc-300">Activity ideas</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Suggest something to do. Upvote what you like.</p>
      </div>

      {!disabled && (
        <form onSubmit={addIdea} className="space-y-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Dinner at Thai Basil"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
          />

          <PlacesInput
            value={location}
            onChange={setLocation}
            placeholder="Location (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
          />

          {/* Collapsible details: outdoor + duration */}
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 touch-manipulation py-1"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            {showDetails ? 'Fewer details' : 'Add outdoor / duration'}
          </button>

          {showDetails && (
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3">
              {/* Outdoor toggle */}
              <label className="flex items-center gap-3 cursor-pointer touch-manipulation min-h-[44px]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOutdoor}
                  onClick={() => setIsOutdoor(v => !v)}
                  className={`relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-800 ${
                    isOutdoor ? 'bg-indigo-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      isOutdoor ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-300">Outdoor activity</span>
              </label>

              {/* Duration picker */}
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-500">Duration (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setDurationMinutes(durationMinutes === p.value ? null : p.value)
                        setCustomDuration('')
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation min-h-[36px] ${
                        durationMinutes === p.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={customDuration}
                    onChange={e => handleCustomDuration(e.target.value)}
                    placeholder="custom min"
                    className="w-24 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[36px]"
                  />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 disabled:opacity-40 transition-colors touch-manipulation min-h-[44px]"
          >
            {submitting ? 'Adding…' : 'Add idea'}
          </button>
        </form>
      )}

      {ideas.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-4">No ideas yet — add the first one.</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map(idea => {
            const voted = nameLower
              ? idea.voter_names.some(v => v.toLowerCase() === nameLower)
              : false
            const votersExpanded = expandedVoters.has(idea.id)
            const collapseVoters = idea.vote_count >= 3

            return (
              <li
                key={idea.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/60 border border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => toggleVote(idea.id)}
                  disabled={disabled}
                  className={`shrink-0 min-w-[44px] min-h-[44px] rounded-xl border text-sm font-semibold transition-colors touch-manipulation ${
                    voted
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  } disabled:opacity-40`}
                  aria-label={voted ? 'Remove vote' : 'Upvote'}
                >
                  ▲ {idea.vote_count}
                </button>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-medium text-zinc-200">{idea.title}</p>

                  {/* Badges: outdoor + duration */}
                  {(idea.is_outdoor || idea.duration_minutes) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {idea.is_outdoor && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-900/50 border border-emerald-800/60 text-[10px] font-medium text-emerald-400">
                          Outdoor
                        </span>
                      )}
                      {idea.duration_minutes && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-700/60 border border-zinc-700 text-[10px] font-medium text-zinc-400">
                          {formatDuration(idea.duration_minutes)}
                        </span>
                      )}
                    </div>
                  )}

                  {idea.location && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{idea.location}</p>
                  )}

                  {/* Voter names — collapsed when 3+ votes */}
                  {idea.vote_count > 0 && (
                    collapseVoters && !votersExpanded ? (
                      <button
                        type="button"
                        onClick={() => toggleVoterExpand(idea.id)}
                        className="text-xs text-zinc-600 mt-1 hover:text-zinc-400 transition-colors touch-manipulation"
                      >
                        {idea.vote_count} people voted · show
                      </button>
                    ) : (
                      <p
                        className="text-xs text-zinc-600 mt-1 truncate cursor-pointer hover:text-zinc-400 transition-colors"
                        onClick={() => collapseVoters && toggleVoterExpand(idea.id)}
                      >
                        {idea.voter_names.join(', ')}
                        {collapseVoters && ' · hide'}
                      </p>
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
