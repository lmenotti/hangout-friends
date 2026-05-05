'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function buildMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { firstDay, daysInMonth }
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function NewPollPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const { firstDay, daysInMonth } = buildMonthDays(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const toggleDate = (iso: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !creatorName.trim() || selectedDates.size === 0) {
      setError('Fill in all fields and select at least one date.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          creator_name: creatorName.trim(),
          date_options: Array.from(selectedDates).sort(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/polls/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">New Availability Poll</h1>
        <p className="text-sm text-zinc-500 mt-1">Share the link with anyone — no account needed to respond.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Poll title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Weekend hangout?"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Your name</label>
          <input
            value={creatorName}
            onChange={e => setCreatorName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Select dates
            {selectedDates.size > 0 && (
              <span className="ml-2 text-indigo-400 font-normal">{selectedDates.size} selected</span>
            )}
          </label>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-sm font-medium text-zinc-200">{monthLabel}</span>
              <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[11px] text-zinc-600 font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = toISO(viewYear, viewMonth, day)
                const selected = selectedDates.has(iso)
                const isPast = new Date(iso) < new Date(today.toDateString())
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => toggleDate(iso)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                      selected
                        ? 'bg-indigo-600 text-white'
                        : isPast
                        ? 'text-zinc-700 cursor-not-allowed'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDates.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selectedDates).sort().map(d => (
                <span key={d} className="inline-flex items-center gap-1 bg-indigo-600/20 text-indigo-300 text-xs px-2 py-1 rounded-lg">
                  {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <button type="button" onClick={() => toggleDate(d)} className="hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors touch-manipulation"
        >
          {submitting ? 'Creating…' : 'Create poll'}
        </button>
      </form>
    </div>
  )
}
