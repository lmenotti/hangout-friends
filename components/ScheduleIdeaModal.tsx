'use client'

import { useState } from 'react'
import RecurrencePicker from './RecurrencePicker'
import AvailabilityGrid from './AvailabilityGrid'

type Idea = {
  id: string
  title: string
  suggested_place: string | null
  proposed_date: string | null
  proposed_time: string | null
}

type Props = {
  idea: Idea
  podId: string
  token: string
  onClose: () => void
  onScheduled: () => void
}

export default function ScheduleIdeaModal({ idea, podId, token, onClose, onScheduled }: Props) {
  const hasAnchor = Boolean(idea.proposed_date)

  const [date, setDate] = useState(idea.proposed_date ?? '')
  const [time, setTime] = useState(idea.proposed_time?.slice(0, 5) ?? '18:00')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState(idea.suggested_place ?? '')
  const [recurrenceRule, setRecurrenceRule] = useState('')
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) { setError('Date and time required.'); return }
    setSubmitting(true)
    setError('')

    const scheduled_at = `${date}T${time}:00`
    const end_time = endTime ? `${date}T${endTime}:00` : null

    const res = await fetch(`/api/pods/${podId}/ideas/${idea.id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ scheduled_at, end_time, location, recurrence_rule: recurrenceRule, recurrence_end: recurrenceEnd }),
    })

    if (res.ok) {
      onScheduled()
    } else {
      const data = await res.json()
      setError(data.error)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Schedule idea</h2>
            <p className="text-sm text-zinc-500 mt-0.5">{idea.title}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">End time (optional)</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Location (optional)</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={idea.suggested_place ?? 'Where?'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <RecurrencePicker
            value={recurrenceRule}
            endDate={recurrenceEnd}
            onChange={(rule, end) => { setRecurrenceRule(rule); setRecurrenceEnd(end) }}
          />

          {/* Toggle heatmap */}
          <button
            type="button"
            onClick={() => setShowHeatmap(v => !v)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {showHeatmap ? 'Hide' : 'Show'} group availability
          </button>
          {showHeatmap && (
            <div className="bg-zinc-800 rounded-xl p-3 max-h-64 overflow-y-auto">
              <AvailabilityGrid podId={podId} readOnly />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
            >
              {submitting ? 'Scheduling…' : 'Schedule it'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
