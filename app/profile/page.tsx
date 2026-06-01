'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import PlacesInput from '@/components/PlacesInput'
import type { UserPublic } from '@/types/database'

const CALENDAR_MESSAGES: Record<string, { text: string; tone: 'ok' | 'err' }> = {
  connected: { text: 'Google Calendar connected.', tone: 'ok' },
  denied: { text: 'Google Calendar connection was cancelled.', tone: 'err' },
  error: { text: 'Could not connect Google Calendar. Try again.', tone: 'err' },
  unavailable: { text: 'Google Calendar is not available in this environment.', tone: 'err' },
  'sign-in-required': { text: 'Sign in before connecting Google Calendar.', tone: 'err' },
  signin: { text: 'Sign in first, then connect Google Calendar.', tone: 'err' },
}

export default function ProfilePage() {
  const { user, token, updateUser, clearUser } = useUser()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [homeLocation, setHomeLocation] = useState(user?.home_location ?? '')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarMessage, setCalendarMessage] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('calendar')
    if (!status) return

    const msg = CALENDAR_MESSAGES[status]
    if (msg) setCalendarMessage(msg)

    if (status === 'connected' && token) {
      fetch('/api/users', { headers: { 'x-user-token': token } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: UserPublic | null) => {
          if (data && !('error' in data)) updateUser(data)
        })
    }

    router.replace('/profile')
  }, [token, updateUser, router])

  useEffect(() => {
    if (user?.name) setDisplayName(user.name)
  }, [user?.name])

  useEffect(() => {
    setHomeLocation(user?.home_location ?? '')
  }, [user?.home_location])

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4 pb-24">
        <p className="text-zinc-500 text-sm text-center">Sign in to view your profile, connect calendar, and manage pods.</p>
        <Link
          href="/auth/signin?returnTo=/profile"
          className="px-5 py-3 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors touch-manipulation"
        >
          Sign in with email
        </Link>
      </main>
    )
  }

  const handleSaveName = async () => {
    if (!token) return
    setSavingName(true)
    setNameError('')
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-token': token },
        body: JSON.stringify({ name: displayName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateUser(data)
      setDisplayName(data.name)
      setEditingName(false)
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Could not save name')
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-token': token },
        body: JSON.stringify({ home_location: homeLocation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = () => {
    clearUser()
    router.push('/')
  }

  const handleConnectCalendar = () => {
    window.location.href = '/api/google/auth'
  }

  const handleDisconnectCalendar = async () => {
    if (!token) return
    setCalendarLoading(true)
    setCalendarMessage(null)
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'DELETE',
        headers: { 'x-user-token': token },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Disconnect failed')
      const userRes = await fetch('/api/users', { headers: { 'x-user-token': token } })
      const userData: UserPublic | { error: string } = await userRes.json()
      if (userRes.ok && userData && !('error' in userData)) updateUser(userData)
      setCalendarMessage({ text: 'Google Calendar disconnected.', tone: 'ok' })
    } catch (err: unknown) {
      setCalendarMessage({
        text: err instanceof Error ? err.message : 'Disconnect failed',
        tone: 'err',
      })
    } finally {
      setCalendarLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-24 pt-6 md:pt-10">
      <div className="mx-auto max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Profile</h1>
          <p className="mt-1 text-sm text-zinc-500">Your account settings</p>
        </div>

        {/* Name */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Name</p>
            <button
              type="button"
              onClick={() => {
                if (editingName) {
                  void handleSaveName()
                } else {
                  setDisplayName(user.name)
                  setNameError('')
                  setEditingName(true)
                }
              }}
              disabled={editingName && (savingName || !displayName.trim())}
              className="shrink-0 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors touch-manipulation"
            >
              {savingName ? 'Saving…' : editingName ? 'Save name' : 'Edit name'}
            </button>
          </div>
          {editingName ? (
            <>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                maxLength={40}
                autoFocus
                placeholder="Your first name"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            </>
          ) : (
            <p className="text-base font-medium text-zinc-100">{user.name}</p>
          )}
          {user.email && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 pt-1">Email</p>
              <p className="text-sm text-zinc-300">{user.email}</p>
            </>
          )}
        </div>

        {/* Home location */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Home location</p>
            <p className="mt-0.5 text-xs text-zinc-600">Used to estimate your commute time to events.</p>
          </div>
          <PlacesInput
            value={homeLocation}
            onChange={setHomeLocation}
            placeholder="e.g. 123 Main St, Berkeley, CA"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <p className="text-xs text-zinc-600">Include street, city, and state for accurate commute estimates.</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSaveLocation}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium py-3 rounded-xl transition-colors touch-manipulation"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save location'}
          </button>
        </div>

        {/* Google Calendar */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Google Calendar</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Read-only sync to pre-fill unavailable times when you respond to plans.
            </p>
          </div>
          {calendarMessage && (
            <p
              className={`text-xs ${calendarMessage.tone === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {calendarMessage.text}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">
              {user.google_calendar_connected ? 'Connected' : 'Not connected'}
            </p>
            {user.google_calendar_connected ? (
              <button
                onClick={handleDisconnectCalendar}
                disabled={calendarLoading}
                className="shrink-0 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors touch-manipulation"
              >
                {calendarLoading ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnectCalendar}
                disabled={calendarLoading}
                className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors touch-manipulation"
              >
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>

        {/* Links & actions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          <Link
            href="/bugs"
            className="flex items-center justify-between px-4 py-3.5 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-t-2xl transition-colors"
          >
            <span>Report a bug</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-600">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800/50 rounded-b-2xl transition-colors touch-manipulation"
          >
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </main>
  )
}
