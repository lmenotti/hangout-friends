'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@/context/UserContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_JS = [0, 1, 2, 3, 4, 5, 6]
const START_HOUR = 8
const END_HOUR = 23

function hourLabel(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

type GridState = {
  aggregate: Record<string, number>
  namesPerSlot: Record<string, string[]>
  userSlots: Set<string>
  totalUsers: number
}

function slotBg(count: number, total: number, isUser: boolean): string {
  const base = 'rounded-sm cursor-pointer transition-colors duration-75'
  // User selected, no one else: bright violet
  if (isUser && count <= 1) return `${base} bg-violet-500`
  // User selected + others: vivid violet-tinted green
  if (isUser) {
    const ratio = total > 0 ? count / total : 0
    if (ratio >= 0.75) return `${base} bg-violet-400`
    if (ratio >= 0.5)  return `${base} bg-violet-500`
    return `${base} bg-violet-600`
  }
  // Others only (not you)
  if (count === 0) return `${base} bg-zinc-800`
  const ratio = total > 0 ? count / total : 0
  if (ratio >= 0.75) return `${base} bg-emerald-500`
  if (ratio >= 0.5)  return `${base} bg-emerald-700`
  if (ratio >= 0.25) return `${base} bg-emerald-900`
  return `${base} bg-zinc-700`
}

export default function AvailabilityGrid() {
  const { user, token } = useUser()
  const [grid, setGrid] = useState<GridState>({
    aggregate: {}, namesPerSlot: {}, userSlots: new Set(), totalUsers: 0,
  })
  const [localSlots, setLocalSlots] = useState<Set<string>>(new Set())
  const paintingRef = useRef<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const todayJs = new Date().getDay()

  const fetchGrid = (tok: string | null) =>
    fetch('/api/availability', { headers: tok ? { 'x-user-token': tok } : {} })
      .then(r => r.json())
      .then((data: any) => {
        setGrid({
          aggregate: data.aggregate,
          namesPerSlot: data.namesPerSlot ?? {},
          userSlots: new Set(data.userSlots),
          totalUsers: data.totalUsers,
        })
        setLocalSlots(new Set(data.userSlots))
      })

  useEffect(() => {
    fetchGrid(token).finally(() => setLoading(false))
  }, [token])

  const paintKey = (key: string, adding: boolean) => {
    setLocalSlots(prev => {
      if (adding && prev.has(key)) return prev
      if (!adding && !prev.has(key)) return prev
      const next = new Set(prev)
      adding ? next.add(key) : next.delete(key)
      return next
    })
  }

  // Mouse handlers
  const onMouseDown = (day: number, hour: number) => {
    if (!user) return
    const key = `${day}-${hour}`
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onMouseEnter = (day: number, hour: number) => {
    if (paintingRef.current === null || !user) return
    paintKey(`${day}-${hour}`, paintingRef.current)
  }

  const stopPaint = () => { paintingRef.current = null }

  // Touch handlers — use elementFromPoint to find cell under finger
  const onTouchStart = (e: React.TouchEvent) => {
    if (!user) return
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (!key) return
    const [d, h] = key.split('-').map(Number)
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (paintingRef.current === null || !user) return
    e.preventDefault() // prevent scroll while painting
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (key) paintKey(key, paintingRef.current)
  }

  const save = async () => {
    if (!user || !token) return
    setSaving(true)
    const slots = Array.from(localSlots).map(key => {
      const [d, h] = key.split('-')
      return { day_of_week: parseInt(d), hour: parseInt(h) }
    })
    await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ slots }),
    })
    await fetchGrid(token)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">
          {user ? 'Tap or drag to toggle hours.' : 'Enter your name to mark availability.'}
          {grid.totalUsers > 0 && (
            <span className="ml-1 text-zinc-600">
              ({grid.totalUsers} member{grid.totalUsers !== 1 ? 's' : ''})
            </span>
          )}
        </p>
        {user && (
          <button
            onClick={save}
            disabled={saving}
            className="shrink-0 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white transition-colors touch-manipulation min-h-[40px]"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        )}
      </div>

      {/* Grid — touch-action none so iOS doesn't scroll while painting */}
      <div
        ref={containerRef}
        className="select-none overflow-x-auto pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onMouseUp={stopPaint}
        onMouseLeave={stopPaint}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={stopPaint}
      >
        <div className="min-w-[440px]" style={{ touchAction: user ? 'pan-x' : 'auto' }}>
          {/* Day headers */}
          <div className="grid mb-2" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
            <div />
            {DAYS.map((d, i) => {
              const isToday = DAY_JS[i] === todayJs
              return (
                <div key={d} className="text-center">
                  <span className={`text-[11px] font-medium tracking-wide px-1 py-0.5 rounded-md ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-zinc-500'
                  }`}>
                    {d}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          {hours.map(hour => (
            <div key={hour} className="grid mb-px" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
              <div className="text-right pr-1.5 text-[10px] text-zinc-600 flex items-center justify-end h-7">
                {hourLabel(hour)}
              </div>
              {DAY_JS.map((dayJs) => {
                const key = `${dayJs}-${hour}`
                const count = grid.aggregate[key] ?? 0
                const isUser = localSlots.has(key)
                const names = grid.namesPerSlot[key] ?? []
                return (
                  <div
                    key={dayJs}
                    data-cell={key}
                    title={names.length > 0 ? names.join(', ') : undefined}
                    className={`h-7 mx-px ${slotBg(count, grid.totalUsers, isUser)}`}
                    onMouseDown={() => onMouseDown(dayJs, hour)}
                    onMouseEnter={() => onMouseEnter(dayJs, hour)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" />Nobody</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-900" />Some free</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" />Most free</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" />You</div>
      </div>
    </div>
  )
}
