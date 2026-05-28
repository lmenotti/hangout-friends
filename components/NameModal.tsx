'use client'

import { useState, useRef } from 'react'
import { useUser } from '@/context/UserContext'
import PlacesInput from '@/components/PlacesInput'

export default function NameModal() {
  const { user, signInOpen, setUser, hideSignIn } = useUser()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [homeLocation, setHomeLocation] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const checkDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sign-in is fully optional and only shown when the user explicitly opts in.
  if (!signInOpen || user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, home_location: homeLocation }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsPassword) { setNeedsPassword(true); setIsReturning(true) }
        throw new Error(data.error)
      }
      setUser(data, data.token)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={hideSignIn}
    >
      <div
        className="relative w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 pb-8 sm:pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />
        <button
          type="button"
          onClick={hideSignIn}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="mb-5 pr-8">
          <h2 className="text-lg font-semibold text-zinc-100">Sign in to hangout</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {needsPassword
              ? 'This name is protected — enter the password.'
              : 'Optional — only needed for pods, history, and calendar sync.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => {
              const val = e.target.value
              setName(val)
              setNeedsPassword(false)
              setIsReturning(false)
              setError('')
              clearTimeout(checkDebounce.current)
              if (val.trim().length >= 2) {
                checkDebounce.current = setTimeout(async () => {
                  try {
                    const res = await fetch(`/api/users/check?name=${encodeURIComponent(val.trim())}`)
                    const data = await res.json()
                    if (data.exists) setIsReturning(true)
                  } catch { /* ignore */ }
                }, 400)
              }
            }}
            placeholder="Your name"
            disabled={needsPassword}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50"
            maxLength={40}
            autoComplete="given-name"
            autoFocus={!needsPassword}
          />

          {!isReturning && !needsPassword && (
            <PlacesInput
              value={homeLocation}
              onChange={setHomeLocation}
              placeholder="Your home address or neighborhood (optional)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          )}

          <div className="space-y-1">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={needsPassword ? 'Password' : 'Password (optional)'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              autoComplete="current-password"
              autoFocus={needsPassword}
            />
            {!needsPassword && !error && (
              <p className="text-xs text-zinc-600 px-1">
                Set a password to protect your name. Leave blank for no protection.
              </p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-medium py-3.5 rounded-xl transition-colors touch-manipulation"
          >
            {submitting ? 'Joining…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={hideSignIn}
            className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors touch-manipulation"
          >
            Maybe later
          </button>
        </form>
      </div>
    </div>
  )
}
