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

function slotLabel(key: string) {
  const parts = key.split('-')
  const d = parseInt(parts[0] ?? '0', 10)
  const h = parseInt(parts[1] ?? '0', 10)
  const day = DAYS[d] ?? '—'
  return `${day} · ${hourLabel(h)}`
}

type GridState = {
  aggregate: Record<string, number>
  namesPerSlot: Record<string, string[]>
  userSlots: Set<string>
  totalUsers: number
  memberNames: string[]
  eventSlots: Record<string, 'yes' | 'maybe'>
}

/** Who is marked free for this slot, including unsaved local edits for the current user. */
function availableNamesForSlot(
  key: string,
  grid: GridState,
  localSlots: Set<string>,
  userName: string | undefined,
): Set<string> {
  const set = new Set(grid.namesPerSlot[key] ?? [])
  if (userName) {
    const saved = grid.userSlots.has(key)
    const local = localSlots.has(key)
    if (local && !saved) set.add(userName)
    if (!local && saved) set.delete(userName)
  }
  return set
}

/** Whether `personName` is free in this slot (uses local toggles when they are the signed-in user). */
function isPersonFreeAt(
  personName: string,
  key: string,
  grid: GridState,
  localSlots: Set<string>,
  userName: string | undefined,
): boolean {
  if (userName && personName === userName) return localSlots.has(key)
  return (grid.namesPerSlot[key] ?? []).includes(personName)
}

function slotBg(
  count: number,
  total: number,
  isUser: boolean,
  isEditing: boolean,
  eventStatus?: 'yes' | 'maybe' | null,
): string {
  const base = 'rounded-sm transition-colors duration-75'
  // Event slots take priority in view mode (not in edit mode)
  if (!isEditing && eventStatus === 'yes')   return `${base} bg-indigo-500`
  if (!isEditing && eventStatus === 'maybe') return `${base} bg-indigo-900`
  if (isEditing) {
    return isUser ? `${base} bg-violet-500` : `${base} bg-zinc-800`
  }
  if (isUser && count <= 1) return `${base} bg-violet-500`
  if (isUser) {
    const ratio = total > 0 ? count / total : 0
    if (ratio >= 0.75) return `${base} bg-violet-400`
    if (ratio >= 0.5)  return `${base} bg-violet-500`
    return `${base} bg-violet-600`
  }
  if (count === 0) return `${base} bg-zinc-800`
  const ratio = total > 0 ? count / total : 0
  if (ratio >= 0.75) return `${base} bg-sky-500`
  if (ratio >= 0.5)  return `${base} bg-sky-700`
  if (ratio >= 0.25) return `${base} bg-slate-700`
  return `${base} bg-zinc-700`
}

function slotBgSoloPerson(personFree: boolean): string {
  const base = 'rounded-sm transition-colors duration-75'
  return personFree ? `${base} bg-amber-500` : `${base} bg-zinc-800`
}

export default function AvailabilityGrid() {
  const { user, token } = useUser()
  const [grid, setGrid] = useState<GridState>({
    aggregate: {}, namesPerSlot: {}, userSlots: new Set(), totalUsers: 0, memberNames: [], eventSlots: {},
  })
  const [localSlots, setLocalSlots] = useState<Set<string>>(new Set())
  const paintingRef = useRef<boolean | null>(null)
  const touchActiveRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  /** Hovered or tapped slot — drives the side roster (replaces flaky native tooltips). */
  const [focusedSlotKey, setFocusedSlotKey] = useState<string | null>(null)
  /** Grid shows only this person’s free hours (toggle by clicking a name in the roster). */
  const [filterMember, setFilterMember] = useState<string | null>(null)

  const todayJs = new Date().getDay()

  // Lock body scroll when fullscreen edit overlay is open
  useEffect(() => {
    if (editing) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [editing])

  const fetchGrid = (tok: string | null) =>
    fetch('/api/availability', { headers: tok ? { 'x-user-token': tok } : {} })
      .then(r => r.json())
      .then((data: any) => {
        setGrid({
          aggregate: data.aggregate,
          namesPerSlot: data.namesPerSlot ?? {},
          userSlots: new Set(data.userSlots),
          totalUsers: data.totalUsers,
          memberNames: data.memberNames ?? [],
          eventSlots: data.eventSlots ?? {},
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

  const onMouseDown = (day: number, hour: number) => {
    if (!user || !editing || touchActiveRef.current) return
    setFocusedSlotKey(null)
    setFilterMember(null)
    const key = `${day}-${hour}`
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onMouseEnter = (day: number, hour: number) => {
    if (paintingRef.current === null || !user || !editing || touchActiveRef.current) return
    paintKey(`${day}-${hour}`, paintingRef.current)
  }

  const stopPaint = () => {
    paintingRef.current = null
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (!user || !editing) return
    e.preventDefault()
    touchActiveRef.current = true
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (!key) return
    if (grid.eventSlots[key]) return  // don't paint over event slots
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
    if (key && !grid.eventSlots[key]) paintKey(key, paintingRef.current)
  }

  const onTouchEnd = () => {
    stopPaint()
    setTimeout(() => { touchActiveRef.current = false }, 300)
  }

  const cancel = () => {
    setLocalSlots(new Set(grid.userSlots))
    setEditing(false)
    setFocusedSlotKey(null)
    setFilterMember(null)
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
    setFocusedSlotKey(null)
    setFilterMember(null)
    setTimeout(() => setSaved(false), 2000)
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />

  const clearFocusedSlot = () => setFocusedSlotKey(null)

  const gridProps = {
    onMouseUp: stopPaint,
    onMouseLeave: () => {
      stopPaint()
      clearFocusedSlot()
    },
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }

  const dayHeaders = (
    <div className="grid shrink-0" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
      <div />
      {DAYS.map((d, i) => {
        const isToday = DAY_JS[i] === todayJs
        return (
          <div key={d} className="text-center py-1">
            <span className={`text-[11px] font-medium tracking-wide px-1 py-0.5 rounded-md ${
              isToday ? 'bg-indigo-600 text-white' : 'text-zinc-500'
            }`}>
              {d}
            </span>
          </div>
        )
      })}
    </div>
  )

  const hourCells = (flexRows: boolean) => hours.map(hour => (
    <div
      key={hour}
      className={`grid ${flexRows ? 'flex-1 min-h-0' : 'mb-px'}`}
      style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}
    >
      <div className={`text-right pr-2 text-[10px] text-zinc-600 flex items-start justify-end pt-0.5 ${flexRows ? '' : 'h-10'}`}>
        {hourLabel(hour)}
      </div>
      {DAY_JS.map((dayJs) => {
        const key = `${dayJs}-${hour}`
        const count = grid.aggregate[key] ?? 0
        const isUser = localSlots.has(key)
        const eventStatus = grid.eventSlots[key] ?? null
        const isEventSlot = !editing && eventStatus !== null
        const solo =
          filterMember !== null &&
          !editing &&
          isPersonFreeAt(filterMember, key, grid, localSlots, user?.name)
        const cellClass =
          filterMember !== null && !editing
            ? slotBgSoloPerson(solo)
            : slotBg(count, grid.totalUsers, isUser, editing, eventStatus)
        return (
          <div
            key={dayJs}
            data-cell={key}
            className={`mx-px ${flexRows ? '' : 'h-10'} ${cellClass} ${editing && !isEventSlot ? 'cursor-pointer' : ''}`}
            onMouseDown={() => { if (!isEventSlot) onMouseDown(dayJs, hour) }}
            onMouseEnter={() => {
              if (!isEventSlot) onMouseEnter(dayJs, hour)
              if (paintingRef.current === null) setFocusedSlotKey(key)
            }}
            onClick={() => {
              if (!editing) setFocusedSlotKey(key)
            }}
          />
        )
      })}
    </div>
  ))

  return (
    <>
      {/* Fullscreen edit overlay — mobile only */}
      {editing && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col bg-zinc-950 select-none"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            touchAction: 'none',
          }}
          {...gridProps}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 shrink-0 border-b border-zinc-800"
               style={{ height: '56px' }}>
            <span className="text-sm font-medium text-zinc-300">Edit Availability</span>
            <div className="flex items-center gap-2">
              <button
                onClick={cancel}
                className="px-3 py-1.5 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors touch-manipulation"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="px-2 pt-1">
            {dayHeaders}
          </div>

          {/* Grid — fills remaining height, no scroll */}
          <div className="flex-1 min-h-0 flex flex-col px-2 pb-2 divide-y divide-black">
            {hourCells(true)}
          </div>
        </div>
      )}

      {/* Normal view (always rendered; also used for desktop edit mode) */}
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
                    onClick={cancel}
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
                  onClick={() => {
                    setFilterMember(null)
                    setEditing(true)
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 transition-colors touch-manipulation min-h-[40px]"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Grid + side roster — wrapper keeps focus when moving pointer from grid to list */}
        <div
          className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5"
          onMouseUp={stopPaint}
          onMouseLeave={() => {
            stopPaint()
            clearFocusedSlot()
          }}
        >
          <div
            className="min-w-0 flex-1 select-none"
            style={{ touchAction: editing ? 'none' : 'auto' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {dayHeaders}
            <div className="mt-px">
              {hourCells(false)}
            </div>
          </div>

          <aside
            className="w-full shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow-sm lg:w-[12rem] xl:w-[13rem]"
            aria-live="polite"
          >
            {filterMember && (
              <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5">
                <p className="text-[11px] leading-snug text-amber-100/90">
                  Grid: only <span className="font-medium text-amber-50">{filterMember}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setFilterMember(null)}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-200/80 hover:bg-amber-500/20 hover:text-amber-50"
                >
                  Clear
                </button>
              </div>
            )}
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">This slot</p>
            {grid.memberNames.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">No members yet.</p>
            ) : focusedSlotKey ? (
              <>
                <p className="mt-1 text-sm font-medium text-zinc-100 tabular-nums">
                  {slotLabel(focusedSlotKey)}
                </p>
                <p className="mt-1.5 text-[10px] text-zinc-500">Click a name to show only that person on the grid.</p>
                <ul className="mt-2 max-h-[min(22rem,55vh)] space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                  {grid.memberNames.map((name, i) => {
                    const free = availableNamesForSlot(
                      focusedSlotKey,
                      grid,
                      localSlots,
                      user?.name,
                    ).has(name)
                    const filtered = filterMember === name
                    return (
                      <li key={`${name}-${i}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFilterMember((prev) => (prev === name ? null : name))
                          }}
                          className={`flex min-w-0 w-full items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors ${
                            filtered ? 'bg-amber-500/15 ring-1 ring-amber-400/35' : 'hover:bg-zinc-800/80'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-150 ${
                              free
                                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                                : 'bg-zinc-600'
                            }`}
                            aria-hidden
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-sm ${free ? 'text-zinc-100' : 'text-zinc-500'} ${
                              filtered ? 'font-medium text-amber-100/95' : ''
                            }`}
                          >
                            {name}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Hover or tap a slot, then click a name to solo their schedule on the grid.
                </p>
                <ul className="mt-3 max-h-[min(14rem,40vh)] space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                  {grid.memberNames.map((name, i) => {
                    const filtered = filterMember === name
                    return (
                      <li key={`${name}-${i}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFilterMember((prev) => (prev === name ? null : name))
                          }}
                          className={`flex min-w-0 w-full items-center gap-2.5 rounded-md px-1 py-1 text-left text-sm transition-colors ${
                            filtered
                              ? 'bg-amber-500/15 font-medium text-amber-100/95 ring-1 ring-amber-400/35'
                              : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${filtered ? 'bg-amber-400' : 'bg-zinc-600'}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">{name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </aside>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
          {filterMember && !editing ? (
            <>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" />Not free</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" />{filterMember} free</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" />Nobody free</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-700" />Few others</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-700" />Some overlap</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-sky-500" />Strong overlap</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" />You&apos;re free</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" />Event (going)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-900" />Event (maybe)</div>
            </>
          )}
        </div>
      </div>

    </>
  )
}
