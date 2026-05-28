'use client'

import { useRef } from 'react'

const START_HOUR = 9
const END_HOUR = 21

function hourLabel(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export function slotKey(date: string, hour: number, minute: 0 | 30) {
  return `${date}-${hour}-${minute}`
}

export function formatSlotLabel(key: string): string {
  const parts = key.split('-')
  const date = parts.slice(0, 3).join('-')
  const hour = parseInt(parts[3], 10)
  const minute = parseInt(parts[4], 10) as 0 | 30
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
    .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const ALL_SLOTS: { hour: number; minute: 0 | 30 }[] = []
for (let h = START_HOUR; h < END_HOUR; h++) {
  ALL_SLOTS.push({ hour: h, minute: 0 })
  ALL_SLOTS.push({ hour: h, minute: 30 })
}

function ratioToColor(ratio: number): string {
  if (ratio >= 0.8) return 'bg-teal-300'
  if (ratio >= 0.6) return 'bg-teal-400'
  if (ratio >= 0.4) return 'bg-teal-500'
  if (ratio >= 0.2) return 'bg-teal-700'
  return 'bg-teal-900'
}

function formatDateHeader(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

type Props = {
  dates: string[]            // ISO date strings e.g. ["2026-05-04"]
  mySlots: Set<string>
  aggregate: Record<string, number>
  totalResponders: number
  editing: boolean
  onToggle: (key: string, adding: boolean) => void
  tapMode?: boolean
  onCellInspect?: (key: string) => void
  highlightThreshold?: number | null
}

export default function PollGrid({
  dates,
  mySlots,
  aggregate,
  totalResponders,
  editing,
  onToggle,
  tapMode = false,
  onCellInspect,
  highlightThreshold = null,
}: Props) {
  const paintingRef = useRef<boolean | null>(null)
  const touchActiveRef = useRef(false)

  const stopPaint = () => { paintingRef.current = null }

  const onMouseDown = (key: string) => {
    if (!editing || tapMode) return
    const adding = !mySlots.has(key)
    paintingRef.current = adding
    onToggle(key, adding)
  }

  const onMouseEnter = (key: string) => {
    if (paintingRef.current === null || !editing || tapMode) return
    onToggle(key, paintingRef.current)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (!editing || tapMode) return
    e.preventDefault()
    touchActiveRef.current = true
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (!key) return
    const adding = !mySlots.has(key)
    paintingRef.current = adding
    onToggle(key, adding)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (paintingRef.current === null || !editing || tapMode) return
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const key = el?.dataset?.cell
    if (key) onToggle(key, paintingRef.current)
  }

  const onTouchEnd = () => {
    stopPaint()
    setTimeout(() => { touchActiveRef.current = false }, 300)
  }

  const colCount = dates.length

  return (
    <div
      className="select-none overflow-x-auto"
      style={{ touchAction: editing && !tapMode ? 'none' : 'auto' }}
      onMouseUp={tapMode ? undefined : stopPaint}
      onMouseLeave={tapMode ? undefined : stopPaint}
      onTouchStart={tapMode ? undefined : onTouchStart}
      onTouchMove={tapMode ? undefined : onTouchMove}
      onTouchEnd={tapMode ? undefined : onTouchEnd}
    >
      {/* Header row */}
      <div className="grid mb-1" style={{ gridTemplateColumns: `40px repeat(${colCount}, 1fr)` }}>
        <div />
        {dates.map(d => {
          const { day, date } = formatDateHeader(d)
          return (
            <div key={d} className="text-center px-1">
              <div className="text-[11px] font-medium text-zinc-400">{day}</div>
              <div className="text-[10px] text-zinc-600">{date}</div>
            </div>
          )
        })}
      </div>

      {/* Slot rows */}
      {ALL_SLOTS.map(({ hour, minute }) => (
        <div
          key={`${hour}-${minute}`}
          className="grid mb-px"
          style={{ gridTemplateColumns: `40px repeat(${colCount}, 1fr)` }}
        >
          <div className="text-right pr-2 text-[10px] text-zinc-600 flex items-center justify-end h-11">
            {minute === 0 ? hourLabel(hour) : ''}
          </div>
          {dates.map(date => {
            const key = slotKey(date, hour, minute)
            const count = aggregate[key] ?? 0
            const isMe = mySlots.has(key)
            const ratio = totalResponders > 0 ? count / totalResponders : 0
            const meetsThreshold = highlightThreshold === null || ratio >= highlightThreshold
            const inspectable = !editing && !!onCellInspect

            let cellClass = 'bg-zinc-800'
            if (count > 0 && totalResponders > 0) {
              cellClass = ratioToColor(ratio)
            }
            if (isMe && editing) cellClass = 'bg-indigo-500'
            if (!meetsThreshold && highlightThreshold !== null) {
              cellClass = 'bg-zinc-900 opacity-30'
            }

            const handleInspect = inspectable
              ? (e: React.MouseEvent) => {
                  e.stopPropagation()
                  onCellInspect(key)
                }
              : undefined

            return (
              <div
                key={key}
                data-cell={key}
                role={inspectable ? 'button' : undefined}
                tabIndex={inspectable ? 0 : undefined}
                aria-label={inspectable ? `View availability for ${formatSlotLabel(key)}` : undefined}
                className={`mx-px min-h-[44px] h-11 rounded-sm transition-colors duration-75 ${cellClass} ${
                  editing || inspectable ? 'cursor-pointer touch-manipulation' : ''
                }`}
                onMouseDown={tapMode ? undefined : () => onMouseDown(key)}
                onMouseEnter={tapMode ? undefined : () => onMouseEnter(key)}
                onClick={
                  inspectable
                    ? handleInspect
                    : tapMode && editing
                      ? () => onToggle(key, !mySlots.has(key))
                      : undefined
                }
                onKeyDown={inspectable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onCellInspect(key)
                  }
                } : undefined}
              >
                {count > 0 && !editing && meetsThreshold && (
                  <span className="text-[10px] text-white/80 float-right pr-1 leading-[44px]">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
