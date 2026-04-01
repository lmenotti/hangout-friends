'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import PlacesInput from '@/components/PlacesInput'

export default function ProfilePage() {
  const { user, token, updateUser, clearUser } = useUser()
  const router = useRouter()
  const [homeLocation, setHomeLocation] = useState(user?.home_location ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-zinc-500 text-sm">Sign in to view your profile.</p>
      </main>
    )
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

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-24 pt-6 md:pt-10">
      <div className="mx-auto max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Profile</h1>
          <p className="mt-1 text-sm text-zinc-500">Your account settings</p>
        </div>

        {/* Name */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Name</p>
          <p className="text-base font-medium text-zinc-100">{user.name}</p>
          <p className="text-xs text-zinc-600">Name can&apos;t be changed here. Ask an admin.</p>
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
            placeholder="Address or neighborhood"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSaveLocation}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium py-3 rounded-xl transition-colors touch-manipulation"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save location'}
          </button>
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
