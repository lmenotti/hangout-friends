'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { EventWithRSVPs } from '@/types/database'

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

function slotDisplayLabel(key: string) {
  const [d, h, m] = key.split('-').map(Number)
  return `${DAYS[d] ?? '—'} · ${hourLabel(h)}${m === 30 ? ':30' : ''}`
}

// All half-hour slots in display order
const ALL_SLOTS: { hour: number; minute: 0 | 30 }[] = []
for (let h = START_HOUR; h < END_HOUR; h++) {
  ALL_SLOTS.push({ hour: h, minute: 0 })
  ALL_SLOTS.push({ hour: h, minute: 30 })
}

// Compute event-blocked slots in the browser (local timezone avoids UTC mismatch)
function computeEventSlots(events: EventWithRSVPs[]): Record<string, 'yes' | 'maybe'> {
  const result: Record<string, 'yes' | 'maybe'> = {}
  for (const event of events) {
    const status = event.user_rsvp
    if (!status || status === 'no' || !event.scheduled_at) continue
    const start = new Date(event.scheduled_at)
    const day = start.getDay()
    const startH = start.getHours()
    const startM: 0 | 30 = start.getMinutes() < 30 ? 0 : 30

    let endH = startH
    let endM: 0 | 30 = startM === 0 ? 30 : 0
    if (endM === 0) endH++

    if (event.end_time) {
      const end = new Date(event.end_time)
      const rawM = end.getMinutes()
      endH = end.getHours()
      if (rawM === 0) { endM = 0 }
      else if (rawM <= 30) { endM = 30 }
      else { endH++; endM = 0 }
    }

    let h = startH, m: 0 | 30 = startM
    while (h < endH || (h === endH && m < endM)) {
      if (h >= START_HOUR && h < END_HOUR) {
        const key = `${day}-${h}-${m}`
        if (!result[key] || status === 'yes') result[key] = status as 'yes' | 'maybe'
      }
      if (m === 0) { m = 30 } else { h++; m = 0 }
    }
  }
  return result
}

type GridData = {
  aggregate: Record<string, number>
  namesPerSlot: Record<string, string[]>
  userSlots: Set<string>
  totalUsers: number
  memberNames: string[]
}

export default function AvailabilityGrid() {
  const { user, token } = useUser()
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal')
  const [gridData, setGridData] = useState<GridData>({
    aggregate: {}, namesPerSlot: {}, userSlots: new Set(), totalUsers: 0, memberNames: [],
  })
  const [loading, setLoading] = useState(true)

  // Personal tab
  const [localSlots, setLocalSlots] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [events, setEvents] = useState<EventWithRSVPs[]>([])
  const paintingRef = useRef<boolean | null>(null)
  const touchActiveRef = useRef(false)

  // Group tab
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [filterMember, setFilterMember] = useState<string | null>(null)

  const todayJs = new Date().getDay()
  const eventSlots = computeEventSlots(events)

  // Body scroll lock — mobile only, personal edit mode
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    document.body.style.overflow = editing && isMobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [editing])

  const fetchGrid = async (tok: string | null) => {
    const res = await fetch('/api/availability', {
      headers: tok ? { 'x-user-token': tok } : {},
    })
    const data = await res.json()
    const slots = new Set<string>(data.userSlots ?? [])
    setGridData({
      aggregate: data.aggregate ?? {},
      namesPerSlot: data.namesPerSlot ?? {},
      userSlots: slots,
      totalUsers: data.totalUsers ?? 0,
      memberNames: data.memberNames ?? [],
    })
    setLocalSlots(new Set(slots))
  }

  const fetchEvents = async (tok: string | null) => {
    if (!tok) return
    const res = await fetch('/api/events', { headers: { 'x-user-token': tok } })
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    Promise.all([fetchGrid(token), fetchEvents(token)]).finally(() => setLoading(false))
  }, [token])

  // --- Paint handlers (personal tab) ---

  const paintKey = (key: string, adding: boolean) => {
    if (eventSlots[key]) return
    setLocalSlots(prev => {
      if (adding === prev.has(key)) return prev  // no change needed
      const next = new Set(prev)
      adding ? next.add(key) : next.delete(key)
      return next
    })
  }

  const stopPaint = () => { paintingRef.current = null }

  const onMouseDown = (key: string) => {
    if (!user || !editing || touchActiveRef.current || eventSlots[key]) return
    const adding = !localSlots.has(key)
    paintingRef.current = adding
    paintKey(key, adding)
  }

  const onMouseEnter = (key: string) => {
    if (paintingRef.current === null || !user || !editing || touchActiveRef.current) return
    paintKey(key, paintingRef.current)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (!user || !editing) return
    e.preventDefault()
    touchActiveRef.current = true
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (!key || eventSlots[key]) return
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
    if (key && !eventSlots[key]) paintKey(key, paintingRef.current)
  }

  const onTouchEnd = () => {
    stopPaint()
    setTimeout(() => { touchActiveRef.current = false }, 300)
  }

  const cancelEdit = () => {
    setLocalSlots(new Set(gridData.userSlots))
    setEditing(false)
  }

  const saveEdit = async () => {
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
    await fetchGrid(token)
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />

  // --- Shared day header ---
  const dayHeaders = (
    <div className="grid shrink-0" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
      <div />
      {DAYS.map((d, i) => (
        <div key={d} className="text-center py-1">
          <span className={`text-[11px] font-medium tracking-wide px-1 py-0.5 rounded-md ${
            DAY_JS[i] === todayJs ? 'bg-indigo-600 text-white' : 'text-zinc-500'
          }`}>
            {d}
          </span>
        </div>
      ))}
    </div>
  )

  // --- Personal grid rows ---
  const personalRows = (flexRows: boolean) => ALL_SLOTS.map(({ hour, minute }) => (
    <div
      key={`${hour}-${minute}`}
      className={`grid ${flexRows ? 'flex-1 min-h-0' : 'mb-px'}`}
      style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}
    >
      <div className={`text-right pr-2 text-[10px] text-zinc-600 flex items-start justify-end pt-0.5 ${flexRows ? '' : 'h-5'}`}>
        {minute === 0 ? hourLabel(hour) : ''}
      </div>
      {DAY_JS.map(dayJs => {
        const key = `${dayJs}-${hour}-${minute}`
        const es = eventSlots[key]
        const isUser = localSlots.has(key)
        let bg: string
        if (es === 'yes')   bg = 'bg-rose-600'
        else if (es === 'maybe') bg = 'bg-rose-900'
        else if (isUser)    bg = 'bg-violet-500'
        else                bg = 'bg-zinc-800'
        const canPaint = editing && !es
        return (
          <div
            key={dayJs}
            data-cell={key}
            className={`mx-px rounded-sm transition-colors duration-75 ${flexRows ? '' : 'h-5'} ${bg} ${canPaint ? 'cursor-pointer' : ''}`}
            onMouseDown={() => onMouseDown(key)}
            onMouseEnter={() => onMouseEnter(key)}
          />
        )
      })}
    </div>
  ))

  // --- Group grid rows ---
  const groupRows = () => ALL_SLOTS.map(({ hour, minute }) => (
    <div
      key={`${hour}-${minute}`}
      className="grid mb-px"
      style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}
    >
      <div className="text-right pr-2 text-[10px] text-zinc-600 flex items-start justify-end pt-0.5 h-5">
        {minute === 0 ? hourLabel(hour) : ''}
      </div>
      {DAY_JS.map(dayJs => {
        const key = `${dayJs}-${hour}-${minute}`
        let bg: string
        if (filterMember !== null) {
          bg = (gridData.namesPerSlot[key] ?? []).includes(filterMember) ? 'bg-amber-500' : 'bg-zinc-800'
        } else {
          const count = gridData.aggregate[key] ?? 0
          if (count === 0) {
            bg = 'bg-zinc-800'
          } else {
            const ratio = gridData.totalUsers > 0 ? count / gridData.totalUsers : 0
            if (ratio >= 0.8)       bg = 'bg-teal-300'
            else if (ratio >= 0.6)  bg = 'bg-teal-400'
            else if (ratio >= 0.4)  bg = 'bg-teal-600'
            else if (ratio >= 0.2)  bg = 'bg-teal-800'
            else                    bg = 'bg-teal-950'
          }
        }
        return (
          <div
            key={dayJs}
            data-cell={key}
            className={`mx-px h-5 rounded-sm transition-colors duration-75 ${bg}`}
            onMouseEnter={() => setFocusedKey(key)}
            onClick={() => setFocusedKey(key)}
          />
        )
      })}
    </div>
  ))

  const touchHandlers = { onTouchStart, onTouchMove, onTouchEnd }

  return (
    <>
      {/* Fullscreen edit overlay — personal tab, mobile only */}
      {editing && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col bg-zinc-950 select-none"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', touchAction: 'none' }}
          onMouseUp={stopPaint}
          {...touchHandlers}
        >
          <div className="flex items-center justify-between px-4 shrink-0 border-b border-zinc-800" style={{ height: '56px' }}>
            <span className="text-sm font-medium text-zinc-300">Edit Availability</span>
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="px-3 py-1.5 text-sm font-medium rounded-xl bg-zinc-800 text-zinc-300 touch-manipulation">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-1.5 text-sm font-medium rounded-xl bg-indigo-600 disabled:opacity-50 text-white touch-manipulation">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          <div className="px-2 pt-1 shrink-0">{dayHeaders}</div>
          <div className="flex-1 min-h-0 flex flex-col px-2 pb-2 divide-y divide-black">
            {personalRows(true)}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/60">
          {(['personal', 'group'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors touch-manipulation ${
                activeTab === tab ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'personal' ? 'My Schedule' : 'Group'}
            </button>
          ))}
        </div>

        {/* ── Personal tab ── */}
        {activeTab === 'personal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-zinc-500">
                {!user
                  ? 'Enter your name to mark your availability.'
                  : editing
                  ? 'Tap or drag to toggle time slots.'
                  : 'Tap Edit to update your schedule.'}
              </p>
              {user && (
                <div className="flex gap-2 shrink-0">
                  {editing ? (
                    <>
                      <button onClick={cancelEdit} className="px-3 py-2 text-sm font-medium rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors touch-manipulation min-h-[40px]">
                        Cancel
                      </button>
                      <button onClick={saveEdit} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors touch-manipulation min-h-[40px]">
                        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors touch-manipulation min-h-[40px]">
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <div
              className="select-none"
              style={{ touchAction: editing ? 'none' : 'auto' }}
              onMouseUp={stopPaint}
              onMouseLeave={stopPaint}
              {...touchHandlers}
            >
              {dayHeaders}
              <div className="mt-px">{personalRows(false)}</div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" />Not marked</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" />You&apos;re free</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-600" />Event (going)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-900" />Event (maybe)</div>
            </div>
          </div>
        )}

        {/* ── Group tab ── */}
        {activeTab === 'group' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              {gridData.totalUsers > 0
                ? `${gridData.totalUsers} member${gridData.totalUsers !== 1 ? 's' : ''} — hover a slot to see who's free.`
                : 'No members have set availability yet.'}
            </p>

            <div
              className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5"
              onMouseLeave={() => setFocusedKey(null)}
            >
              {/* Heatmap */}
              <div className="min-w-0 flex-1 select-none">
                {dayHeaders}
                <div className="mt-px">{groupRows()}</div>
              </div>

              {/* Side roster */}
              <aside className="w-full shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 lg:w-48 xl:w-52 flex flex-col" aria-live="polite">
                {filterMember && (
                  <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5">
                    <p className="text-[11px] leading-snug text-amber-100/90">
                      Grid: only <span className="font-medium text-amber-50">{filterMember}</span>
                    </p>
                    <button onClick={() => setFilterMember(null)} className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-200/80 hover:bg-amber-500/20">
                      Clear
                    </button>
                  </div>
                )}

                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">This slot</p>

                {gridData.memberNames.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">No members yet.</p>
                ) : focusedKey ? (
                  <>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{slotDisplayLabel(focusedKey)}</p>
                    <p className="mt-1.5 text-[10px] text-zinc-500">Click a name to filter the grid.</p>
                    <ul className="mt-2 flex-1 min-h-0 space-y-0.5 overflow-y-auto pr-0.5">
                      {gridData.memberNames.map((name, i) => {
                        const free = (gridData.namesPerSlot[focusedKey] ?? []).includes(name)
                        const filtered = filterMember === name
                        return (
                          <li key={`${name}-${i}`}>
                            <button
                              type="button"
                              onClick={() => setFilterMember(p => p === name ? null : name)}
                              className={`flex w-full min-w-0 items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors ${
                                filtered ? 'bg-amber-500/15 ring-1 ring-amber-400/35' : 'hover:bg-zinc-800/80'
                              }`}
                            >
                              <span className={`h-2 w-2 shrink-0 rounded-full ${free ? 'bg-teal-400' : 'bg-zinc-600'}`} />
                              <span className={`min-w-0 flex-1 truncate text-sm ${free ? 'text-zinc-100' : 'text-zinc-500'} ${filtered ? 'font-medium text-amber-100/95' : ''}`}>
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
                    <p className="mt-2 text-xs text-zinc-500 leading-relaxed">Hover a slot to see who's available. Click a name to solo their schedule.</p>
                    <ul className="mt-3 flex-1 min-h-0 space-y-0.5 overflow-y-auto pr-0.5">
                      {gridData.memberNames.map((name, i) => {
                        const filtered = filterMember === name
                        return (
                          <li key={`${name}-${i}`}>
                            <button
                              type="button"
                              onClick={() => setFilterMember(p => p === name ? null : name)}
                              className={`flex w-full min-w-0 items-center gap-2.5 rounded-md px-1 py-1 text-left text-sm transition-colors ${
                                filtered ? 'bg-amber-500/15 font-medium text-amber-100/95 ring-1 ring-amber-400/35' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                              }`}
                            >
                              <span className={`h-2 w-2 shrink-0 rounded-full ${filtered ? 'bg-amber-400' : 'bg-zinc-600'}`} />
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

          </div>
        )}
      </div>
    </>
  )
}
