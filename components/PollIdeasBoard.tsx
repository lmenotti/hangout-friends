'use client'

import { useState } from 'react'

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
          created_by_name: name.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTitle('')
      setLocation('')
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
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
          />
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
                  {idea.location && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{idea.location}</p>
                  )}
                  {idea.vote_count > 0 && (
                    <p className="text-xs text-zinc-600 mt-1 truncate">
                      {idea.voter_names.join(', ')}
                    </p>
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
