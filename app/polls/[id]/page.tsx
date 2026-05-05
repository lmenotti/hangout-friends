'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import PollGrid from '@/components/PollGrid'

type Poll = { id: string; title: string; creator_name: string; date_options: string[] }
type Response = { id: string; respondent_name: string; availability: Record<string, boolean> }

function slotKey(date: string, hour: number, minute: 0 | 30) {
  return `${date}-${hour}-${minute}`
}

export default function PollPage() {
  const { id } = useParams<{ id: string }>()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [aggregate, setAggregate] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [mySlots, setMySlots] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const fetchPoll = useCallback(async () => {
    const res = await fetch(`/api/polls/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setPoll(data.poll)
    setResponses(data.responses)
    setAggregate(data.aggregate)
  }, [id])

  useEffect(() => {
    fetchPoll().finally(() => setLoading(false))
    const stored = localStorage.getItem('poll_name')
    if (stored) setName(stored)
  }, [fetchPoll])

  // Pre-fill grid if this name already responded
  useEffect(() => {
    if (!name.trim()) return
    const existing = responses.find(r => r.respondent_name.toLowerCase() === name.trim().toLowerCase())
    if (existing) {
      const slots = new Set(Object.entries(existing.availability).filter(([, v]) => v).map(([k]) => k))
      setMySlots(slots)
    }
  }, [name, responses])

  const handleToggle = useCallback((key: string, adding: boolean) => {
    setMySlots(prev => {
      if (adding === prev.has(key)) return prev
      const next = new Set(prev)
      adding ? next.add(key) : next.delete(key)
      return next
    })
  }, [])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Enter your name first.'); return }
    setSubmitting(true)
    setError('')
    localStorage.setItem('poll_name', name.trim())

    const availability: Record<string, boolean> = {}
    for (const key of mySlots) availability[key] = true

    const res = await fetch(`/api/polls/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respondent_name: name.trim(), availability }),
    })

    if (res.ok) {
      await fetchPoll()
      setEditing(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error)
    }
    setSubmitting(false)
  }

  // Best times: sort slots by count descending
  const bestTimes = Object.entries(aggregate)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, count]) => {
      const parts = key.split('-')
      const date = parts.slice(0, 3).join('-')
      const hour = parseInt(parts[3])
      const minute = parseInt(parts[4]) as 0 | 30
      const label = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
        .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      return { label, count }
    })

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />
  if (!poll) return <p className="text-zinc-500">Poll not found.</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{poll.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Created by {poll.creator_name} · {responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Copy link
        </button>
      </div>

      {/* Name input */}
      <div className="flex gap-3 items-center">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
        />
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors touch-manipulation"
          >
            {responses.find(r => r.respondent_name.toLowerCase() === name.trim().toLowerCase()) ? 'Edit response' : 'Mark availability'}
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2.5 text-sm rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
            >
              {submitting ? 'Saving…' : submitted ? '✓ Saved' : 'Save'}
            </button>
          </>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {editing && <p className="text-xs text-zinc-500">Click or drag to mark when you&apos;re free.</p>}

      {/* Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
        <PollGrid
          dates={poll.date_options}
          mySlots={mySlots}
          aggregate={aggregate}
          totalResponders={responses.length}
          editing={editing}
          onToggle={handleToggle}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        {editing && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Your selection</div>}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {['bg-teal-900','bg-teal-700','bg-teal-500','bg-teal-400','bg-teal-300'].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          Group availability
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Best times */}
        {bestTimes.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Best times</h2>
            <ul className="space-y-2">
              {bestTimes.map(({ label, count }, i) => (
                <li key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-xs text-teal-400 font-medium shrink-0">{count} / {responses.length}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Participants */}
        {responses.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Responses</h2>
            <ul className="space-y-1.5">
              {responses.map(r => (
                <li key={r.id} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  {r.respondent_name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
