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

function slotBg(count: number, total: number, isUser: boolean, isEditing: boolean): string {
  const base = 'rounded-sm transition-colors duration-75'
  // In edit mode: only show purple (you) or dark (not you) — no green overlay
  if (isEditing) {
    return isUser ? `${base} bg-violet-500` : `${base} bg-zinc-800`
  }
  // View mode: full colour scale
  if (isUser && count <= 1) return `${base} bg-violet-500`
  if (isUser) {
    const ratio = total > 0 ? count / total : 0
    if (ratio >= 0.75) return `${base} bg-violet-400`
    if (ratio >= 0.5)  return `${base} bg-violet-500`
    return `${base} bg-violet-600`
  }
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
  const touchActiveRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
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

  // Mouse handlers — desktop only; skipped if a touch event just fired
  const onMouseDown = (day: number, hour: number) => {
    if (!user || !editing || touchActiveRef.current) return
    const key = `${day}-${hour}`
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onMouseEnter = (day: number, hour: number) => {
    if (paintingRef.current === null || !user || !editing || touchActiveRef.current) return
    paintKey(`${day}-${hour}`, paintingRef.current)
  }

  const stopPaint = () => { paintingRef.current = null }

  // Touch handlers — only active in editing mode
  const onTouchStart = (e: React.TouchEvent) => {
    if (!user || !editing) return
    e.preventDefault()
    touchActiveRef.current = true
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (!key) return
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (paintingRef.current === null || !user || !editing) return
    e.preventDefault()
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
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">
          {!user
            ? 'Enter your name to mark availability.'
            : editing
            ? 'Tap or drag to toggle hours.'
            : 'Tap Edit to change your availability.'}
          {grid.totalUsers > 0 && (
            <span className="ml-1 text-zinc-600">
              ({grid.totalUsers} member{grid.totalUsers !== 1 ? 's' : ''})
            </span>
          )}
        </p>
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={() => { setLocalSlots(new Set(grid.userSlots)); setEditing(false) }}
                  className="px-3 py-2 text-sm font-medium rounded-xl bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-zinc-200 transition-colors touch-manipulation min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white transition-colors touch-manipulation min-h-[40px]"
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 transition-colors touch-manipulation min-h-[40px]"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="select-none"
        onMouseUp={stopPaint}
        onMouseLeave={stopPaint}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => {
          stopPaint()
          // Keep blocking synthesized mouse events for 300ms (iOS delay before firing mousedown after touch)
          setTimeout(() => { touchActiveRef.current = false }, 300)
        }}
        style={{ touchAction: editing ? 'none' : 'auto' }}
      >
        {/* Day headers */}
        <div className="grid mb-2" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
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
          <div key={hour} className="grid mb-px" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
            <div className="text-right pr-2 text-[10px] text-zinc-600 flex items-center justify-end h-10">
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
                  className={`h-10 mx-px ${slotBg(count, grid.totalUsers, isUser, editing)} ${editing ? 'cursor-pointer' : ''}`}
                  onMouseDown={() => onMouseDown(dayJs, hour)}
                  onMouseEnter={() => onMouseEnter(dayJs, hour)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" />Nobody free</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-900" />Some others free</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" />Most others free</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" />You&apos;re free</div>
      </div>
    </div>
  )
}
