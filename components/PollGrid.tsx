'use client'

import { useRef, useState } from 'react'

const START_HOUR = 9
const END_HOUR = 21

function hourLabel(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function slotKey(date: string, hour: number, minute: 0 | 30) {
  return `${date}-${hour}-${minute}`
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
}

export default function PollGrid({ dates, mySlots, aggregate, totalResponders, editing, onToggle }: Props) {
  const paintingRef = useRef<boolean | null>(null)
  const touchActiveRef = useRef(false)

  const stopPaint = () => { paintingRef.current = null }

  const onMouseDown = (key: string) => {
    if (!editing) return
    const adding = !mySlots.has(key)
    paintingRef.current = adding
    onToggle(key, adding)
  }

  const onMouseEnter = (key: string) => {
    if (paintingRef.current === null || !editing) return
    onToggle(key, paintingRef.current)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (!editing) return
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
    if (paintingRef.current === null || !editing) return
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
      style={{ touchAction: editing ? 'none' : 'auto' }}
      onMouseUp={stopPaint}
      onMouseLeave={stopPaint}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
          <div className="text-right pr-2 text-[10px] text-zinc-600 flex items-start justify-end pt-0.5 h-5">
            {minute === 0 ? hourLabel(hour) : ''}
          </div>
          {dates.map(date => {
            const key = slotKey(date, hour, minute)
            const count = aggregate[key] ?? 0
            const isMe = mySlots.has(key)

            let cellClass = 'bg-zinc-800'
            if (count > 0 && totalResponders > 0) {
              cellClass = ratioToColor(count / totalResponders)
            }
            if (isMe && editing) cellClass = 'bg-indigo-500'

            return (
              <div
                key={key}
                data-cell={key}
                className={`mx-px h-5 rounded-sm transition-colors duration-75 ${cellClass} ${editing ? 'cursor-pointer' : ''}`}
                onMouseDown={() => onMouseDown(key)}
                onMouseEnter={() => onMouseEnter(key)}
              >
                {count > 0 && !editing && (
                  <span className="text-[9px] text-white/80 float-right pr-0.5 leading-5">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
