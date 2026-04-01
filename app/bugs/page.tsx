'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'

export default function BugsPage() {
  const { user, token } = useUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-zinc-400 text-sm">Sign in to submit a bug report.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-2xl">✓</p>
          <p className="text-zinc-200 font-medium">Report submitted</p>
          <p className="text-zinc-500 text-sm">The admin will look into it.</p>
          <button
            onClick={() => { setSubmitted(false); setTitle(''); setDescription('') }}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Submit another
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !token) return
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/bug-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': token },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Report a bug</h1>
        <p className="text-sm text-zinc-500 mt-1">Something broken or off? Let the admin know.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the issue? (required)"
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Steps to reproduce, what you expected, what happened instead… (optional)"
          rows={4}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors touch-manipulation"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
