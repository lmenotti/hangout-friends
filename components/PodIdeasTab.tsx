'use client'

import { useEffect, useState } from 'react'
import ScheduleIdeaModal from './ScheduleIdeaModal'

type Idea = {
  id: string
  title: string
  suggested_place: string | null
  proposed_date: string | null
  proposed_time: string | null
  vote_count: number
  status: string
  created_at: string
  creator: { name: string } | null
  user_voted?: boolean
}

type Props = {
  podId: string
  token: string
  userId: string
  role: string
}

type Sort = 'votes' | 'date' | 'newest'

export default function PodIdeasTab({ podId, token, userId, role }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<Sort>('votes')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [propDate, setPropDate] = useState('')
  const [propTime, setPropTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scheduleIdea, setScheduleIdea] = useState<Idea | null>(null)

  const fetchIdeas = () => {
    fetch(`/api/pods/${podId}/ideas?sort=${sort}`, { headers: { 'x-user-token': token } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setIdeas(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchIdeas() }, [podId, token, sort])

  const handleVote = async (idea: Idea) => {
    const prev = ideas
    setIdeas(ideas.map(i =>
      i.id === idea.id
        ? { ...i, vote_count: i.user_voted ? i.vote_count - 1 : i.vote_count + 1, user_voted: !i.user_voted }
        : i
    ))
    const res = await fetch(`/api/pods/${podId}/ideas/${idea.id}/vote`, {
      method: 'POST',
      headers: { 'x-user-token': token },
    })
    if (!res.ok) setIdeas(prev)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/pods/${podId}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ title: title.trim(), suggested_place: place || null, proposed_date: propDate || null, proposed_time: propTime || null }),
    })
    if (res.ok) {
      setTitle(''); setPlace(''); setPropDate(''); setPropTime('')
      setShowForm(false)
      fetchIdeas()
    }
    setSubmitting(false)
  }

  const sortLabels: Record<Sort, string> = { votes: 'Top', date: 'Date', newest: 'New' }

  if (loading) return <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(['votes', 'date', 'newest'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-2.5 min-h-[44px] text-xs rounded-lg transition-colors touch-manipulation ${sort === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add idea
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What should we do?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={place}
              onChange={e => setPlace(e.target.value)}
              placeholder="Place (optional)"
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={propDate}
              onChange={e => setPropDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim()} className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors">
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Ideas list */}
      {ideas.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No ideas yet — add one above!</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {ideas.map(idea => (
            <div
              key={idea.id}
              className={`bg-zinc-900 border rounded-2xl p-4 space-y-3 ${idea.status === 'scheduled' ? 'border-teal-800/60' : 'border-zinc-800'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 leading-snug">{idea.title}</p>
                  {idea.suggested_place && (
                    <p className="text-xs text-zinc-500 mt-0.5">{idea.suggested_place}</p>
                  )}
                  {idea.proposed_date && (
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {new Date(idea.proposed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {idea.proposed_time ? ` · ${idea.proposed_time.slice(0, 5)}` : ''}
                    </p>
                  )}
                </div>
                {idea.status === 'scheduled' && (
                  <span className="text-[10px] bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded-full shrink-0">scheduled</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(idea)}
                    className={`flex items-center gap-1 px-2.5 py-2.5 min-h-[44px] text-xs rounded-lg transition-colors touch-manipulation ${
                      idea.user_voted ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill={idea.user_voted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {idea.vote_count}
                  </button>
                  <span className="text-[10px] text-zinc-600">{idea.creator?.name}</span>
                </div>

                {idea.status === 'open' && (role === 'owner' || idea.vote_count >= 3) && (
                  <button
                    onClick={() => setScheduleIdea(idea)}
                    className="px-2.5 py-2.5 min-h-[44px] text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors touch-manipulation"
                  >
                    Schedule it
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {scheduleIdea && (
        <ScheduleIdeaModal
          idea={scheduleIdea}
          podId={podId}
          token={token}
          onClose={() => setScheduleIdea(null)}
          onScheduled={() => { setScheduleIdea(null); fetchIdeas() }}
        />
      )}
    </div>
  )
}
