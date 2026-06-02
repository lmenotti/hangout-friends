'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

function ShareScreen({ slug, planTitle }: { slug: string; planTitle: string }) {
  const [copied, setCopied] = useState(false)
  const planUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${slug}` : `/p/${slug}`

  const handleCopy = () => {
    navigator.clipboard.writeText(planUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: planTitle, url: planUrl })
      } catch {
        // user cancelled or share failed — fall through silently
      }
    } else {
      handleCopy()
    }
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="max-w-sm space-y-8 py-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">Plan created</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{planTitle}</h1>
        <p className="text-sm text-zinc-500">Share this link with your group — no account needed to respond.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-sm text-zinc-400 truncate">
        {planUrl}
      </div>

      <div className="space-y-3">
        {canShare && (
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors touch-manipulation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>
        )}
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 font-medium py-3 rounded-xl border transition-colors touch-manipulation ${
            copied
              ? 'bg-teal-950/40 border-teal-800/60 text-teal-300'
              : canShare
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              : 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="pt-2 border-t border-zinc-800 space-y-2">
        <Link
          href={`/p/${slug}?fill=1`}
          className="w-full flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 py-2 transition-colors"
        >
          Mark my availability →
        </Link>
        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 text-sm text-zinc-600 hover:text-zinc-400 py-2 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

export default function NewPollPage() {
  const { user, token } = useUser()
  const [title, setTitle] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(nextSevenDays)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

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
      setCreatedSlug(data.slug)
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (createdSlug) {
    return <ShareScreen slug={createdSlug} planTitle={title} />
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
