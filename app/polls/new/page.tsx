'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const ROLLING_WEEKS = 4

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeekSunday(d: Date): Date {
  const start = new Date(d)
  start.setHours(12, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

function nextSevenDays(): Set<string> {
  const dates = new Set<string>()
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.add(toISO(d))
  }
  return dates
}

function buildRollingDays(viewStart: Date, weeks: number) {
  const days: { iso: string; dayNum: number; monthShort: string; isPast: boolean }[] = []
  const todayIso = toISO(new Date())
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(viewStart)
    d.setDate(viewStart.getDate() + i)
    const iso = toISO(d)
    days.push({
      iso,
      dayNum: d.getDate(),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      isPast: iso < todayIso,
    })
  }
  return days
}

export default function NewPollPage() {
  const router = useRouter()
  const { user, token } = useUser()
  const [title, setTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(nextSevenDays)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewStart, setViewStart] = useState(() => startOfWeekSunday(new Date()))

  useEffect(() => {
    if (user?.name) setCreatorName(user.name)
  }, [user?.name])

  const rollingDays = useMemo(
    () => buildRollingDays(viewStart, ROLLING_WEEKS),
    [viewStart],
  )

  const rangeLabel = useMemo(() => {
    const first = rollingDays[0]
    const last = rollingDays[rollingDays.length - 1]
    if (!first || !last) return ''
    const fmt = (iso: string) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(first.iso)} – ${fmt(last.iso)}`
  }, [rollingDays])

  const toggleDate = (iso: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })
  }

  const prevWeek = () => {
    setViewStart(prev => {
      const next = new Date(prev)
      next.setDate(prev.getDate() - 7)
      return next
    })
  }

  const nextWeek = () => {
    setViewStart(prev => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + 7)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Give your plan a title.'); return }
    if (!creatorName.trim()) { setError('Add your name so people know who created this.'); return }
    if (selectedDates.size === 0) { setError('Select at least one date.'); return }
    setSubmitting(true)
    setError('')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['x-user-token'] = token

      const res = await fetch('/api/polls', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          title: title.trim(),
          creator_name: creatorName.trim(),
          date_options: Array.from(selectedDates).sort(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/p/${data.slug}?fill=1`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the plan.')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">New plan</h1>
        <p className="text-sm text-zinc-500 mt-1">Share the link — no account needed to respond.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the plan? e.g. Weekend hangout"
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-base"
        />

        <input
          value={creatorName}
          onChange={e => setCreatorName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          autoComplete="given-name"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-base"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Select dates
            {selectedDates.size > 0 && (
              <span className="ml-2 text-indigo-400 font-normal">{selectedDates.size} selected</span>
            )}
          </label>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-sm font-medium text-zinc-200 text-center">{rangeLabel}</span>
              <button type="button" onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[11px] text-zinc-600 font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px">
              {rollingDays.map(({ iso, dayNum, monthShort, isPast }) => {
                const selected = selectedDates.has(iso)
                const showMonth = dayNum === 1 || iso === rollingDays[0]?.iso
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isPast}
                    onClick={() => toggleDate(iso)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors touch-manipulation flex flex-col items-center justify-center gap-0 ${
                      selected
                        ? 'bg-indigo-600 text-white'
                        : isPast
                        ? 'text-zinc-700 cursor-not-allowed'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {showMonth && (
                      <span className="text-[9px] font-normal opacity-80 leading-none">{monthShort}</span>
                    )}
                    <span>{dayNum}</span>
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
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors touch-manipulation min-h-[48px]"
        >
          {submitting ? 'Creating…' : 'Get link'}
        </button>
      </form>
    </div>
  )
}
