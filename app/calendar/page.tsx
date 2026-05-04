'use client'

import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { useCallback, useEffect, useState } from "react"
import { enUS } from 'date-fns/locale/en-US'
import { format } from 'date-fns/format'
import { getDay } from 'date-fns/getDay'
import { parse } from 'date-fns/parse'
import { startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { useUser } from '@/context/UserContext'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales,
})

type CalEvent = {
  title: string
  start: Date
  end: Date
  resource: { type: 'availability' | 'google'; count?: number; ratio?: number }
}

function ratioToColor(ratio: number): string {
  if (ratio >= 0.8) return '#2dd4bf'
  if (ratio >= 0.6) return '#14b8a6'
  if (ratio >= 0.4) return '#0d9488'
  if (ratio >= 0.2) return '#0f766e'
  return '#134e4a'
}

function slotsToEvents(
  aggregate: Record<string, number>,
  totalUsers: number,
  weekStart: Date
): CalEvent[] {
  const events: CalEvent[] = []
  for (const [key, count] of Object.entries(aggregate)) {
    if (!count) continue
    const [dayJs, hour, minute] = key.split('-').map(Number)
    let offset = dayJs - 1 // weekStart is Monday (dayJs=1)
    if (offset < 0) offset += 7
    const date = addDays(weekStart, offset)
    const start = new Date(date)
    start.setHours(hour, minute, 0, 0)
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + 30)
    events.push({
      title: String(count),
      start,
      end,
      resource: { type: 'availability', count, ratio: totalUsers > 0 ? count / totalUsers : 0 },
    })
  }
  return events
}

export default function CalendarPage() {
  const { user, token } = useUser()
  const [tab, setTab] = useState<'group' | 'my'>('group')
  const [showMyEvents, setShowMyEvents] = useState(true)
  const [showIndividual, setShowIndividual] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [gridData, setGridData] = useState<{
    aggregate: Record<string, number>
    userSlots: Set<string>
    totalUsers: number
  }>({ aggregate: {}, userSlots: new Set(), totalUsers: 0 })
  const [localSlots, setLocalSlots] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 4)
  const weekLabel = `Week of ${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`

  useEffect(() => {
    fetch('/api/availability', {
      headers: token ? { 'x-user-token': token } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const slots = new Set<string>(data.userSlots ?? [])
        setGridData({
          aggregate: data.aggregate ?? {},
          userSlots: slots,
          totalUsers: data.totalUsers ?? 0,
        })
        setLocalSlots(new Set(slots))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const availabilityEvents = slotsToEvents(gridData.aggregate, gridData.totalUsers, weekStart).filter(Boolean)

  const eventPropGetter = useCallback((event: CalEvent) => {
    if (!event?.resource) return {}
    if (event.resource.type === 'availability') {
      return {
        style: {
          backgroundColor: ratioToColor(event.resource.ratio ?? 0),
          border: 'none',
          borderRadius: '4px',
          color: '#f0fdfa',
          fontSize: '11px',
          padding: '1px 4px',
        },
      }
    }
    return {
      style: {
        backgroundColor: '#4f46e5',
        border: 'none',
        borderRadius: '4px',
        color: '#e0e7ff',
        fontSize: '12px',
      },
    }
  }, [])

  const markNineToFive = () => {
    const next = new Set(localSlots)
    for (let day = 1; day <= 5; day++) {
      for (let h = 9; h < 17; h++) {
        next.add(`${day}-${h}-0`)
        next.add(`${day}-${h}-30`)
      }
    }
    setLocalSlots(next)
  }

  const clearAll = () => setLocalSlots(new Set())

  const saveAvailability = async () => {
    if (!user || !token) return
    setSaving(true)
    const slots = Array.from(localSlots).map(key => {
      const [d, h, m] = key.split('-').map(Number)
      return { day_of_week: d, hour: h, minute: m }
    })
    await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ slots }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Hangout Availability</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {gridData.totalUsers} people responded
        </div>
      </div>

      {/* Tabs + toggles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setTab('group')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors touch-manipulation ${
              tab === 'group' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Group Availability
          </button>
          <button
            onClick={() => setTab('my')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors touch-manipulation ${
              tab === 'my' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="M8 15l2.5 2.5L16 12" />
            </svg>
            My Calendar
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showMyEvents}
              onChange={e => setShowMyEvents(e.target.checked)}
              className="accent-indigo-500 w-4 h-4"
            />
            Show my events
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showIndividual}
              onChange={e => setShowIndividual(e.target.checked)}
              className="accent-indigo-500 w-4 h-4"
            />
            Show individual availability
          </label>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentDate(d => subWeeks(d, 1))}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
        >
          ← Prev
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
        >
          Today
        </button>
        <button
          onClick={() => setCurrentDate(d => addWeeks(d, 1))}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
        >
          Next →
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800" style={{ height: 560 }}>
        {tab === 'group' ? (
          <Calendar
            localizer={localizer}
            events={availabilityEvents}
            startAccessor="start"
            endAccessor="end"
            view={Views.WEEK}
            date={currentDate}
            onNavigate={() => {}}
            toolbar={false}
            eventPropGetter={eventPropGetter as any}
            min={new Date(0, 0, 0, 9, 0)}
            max={new Date(0, 0, 0, 18, 0)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-zinc-700">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p className="text-sm">Connect Google Calendar to see your events here.</p>
            <button
              onClick={() => user && (window.location.href = `/api/google/auth?userId=${user.id}`)}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors touch-manipulation disabled:opacity-40"
              disabled={!user}
            >
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          My Calendar Events
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          My Availability
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {['bg-teal-900', 'bg-teal-700', 'bg-teal-600', 'bg-teal-500', 'bg-teal-400'].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          Group Availability ({gridData.totalUsers > 1 ? `1–${gridData.totalUsers}` : gridData.totalUsers} {gridData.totalUsers === 1 ? 'person' : 'people'})
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-zinc-800">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={markNineToFive}
            className="px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors touch-manipulation"
          >
            Mark 9–5 available
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors touch-manipulation"
          >
            Clear all
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLocalSlots(new Set(gridData.userSlots))}
            className="px-4 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={saveAvailability}
            disabled={saving || !user}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )
}
