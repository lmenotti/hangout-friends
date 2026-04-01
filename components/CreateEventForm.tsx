'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import PlacesInput from '@/components/PlacesInput'

export default function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const { user, token } = useUser()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const reset = () => {
    setTitle(''); setDescription(''); setDate('')
    setStartTime(''); setEndTime(''); setLocation('')
    setError(''); setOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !token) return
    setSubmitting(true)
    setError('')

    const toISO = (d: string, t: string) => {
      if (!d) return null
      const dt = t ? new Date(`${d}T${t}`) : new Date(`${d}T12:00`)
      return isNaN(dt.getTime()) ? null : dt.toISOString()
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: toISO(date, startTime),
        end_time: toISO(date, endTime),
        location: location.trim() || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    reset()
    setSubmitting(false)
    onCreated()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors touch-manipulation"
      >
        + Add event manually
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-zinc-700 bg-zinc-900 space-y-3">
      <p className="text-sm font-medium text-zinc-300">New event</p>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Event name"
        required
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />

      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />

      {/* Date */}
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />

      {/* Start / End time */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Location */}
      <PlacesInput
        value={location}
        onChange={setLocation}
        placeholder="Location (optional) — address or Google Maps link"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={reset}
          className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-colors touch-manipulation"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors touch-manipulation"
        >
          {submitting ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </form>
  )
}
