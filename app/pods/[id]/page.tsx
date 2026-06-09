'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import AvailabilityGrid from '@/components/AvailabilityGrid'
import PodIdeasTab from '@/components/PodIdeasTab'
import PodEventsTab from '@/components/PodEventsTab'
import type { Pod } from '@/types/database'

type Member = { role: string; joined_at: string; users: { id: string; name: string; last_seen: string | null } }

type Tab = 'availability' | 'ideas' | 'events' | 'members'

function timeSince(iso: string | null) {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PodPage() {
  const { id } = useParams<{ id: string }>()
  const { user, token } = useUser()
  const [pod, setPod] = useState<Pod | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [role, setRole] = useState<string>('member')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('availability')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`/api/pods/${id}`, { headers: { 'x-user-token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setPod(data.pod)
        setMembers(data.members)
        setRole(data.role)
      })
      .finally(() => setLoading(false))
  }, [id, token])

  const copyInvite = () => {
    if (!pod) return
    navigator.clipboard.writeText(`${window.location.origin}/pods/join?code=${pod.invite_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />
  if (!pod) return <p className="text-zinc-500">Pod not found or you&apos;re not a member.</p>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'availability', label: 'Availability' },
    { key: 'ideas', label: 'Ideas' },
    { key: 'events', label: 'Events' },
    { key: 'members', label: 'Members' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/pods" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← Pods</Link>
          <h1 className="text-xl font-semibold text-zinc-100 mt-1">{pod.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={copyInvite}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {copied ? 'Copied!' : `Invite · ${pod.invite_code}`}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px touch-manipulation ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'availability' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Group availability</h2>
          <AvailabilityGrid podId={id} readOnly />
        </div>
      )}

      {tab === 'ideas' && token && user && (
        <PodIdeasTab podId={id} token={token} userId={user.id} role={role} />
      )}

      {tab === 'events' && token && user && (
        <PodEventsTab podId={id} token={token} userId={user.id} role={role} />
      )}

      {tab === 'members' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Members</h2>
          <ul className="space-y-2">
            {members.map((m, i) => {
              const isRecent = m.users.last_seen && Date.now() - new Date(m.users.last_seen).getTime() < 5 * 60 * 1000
              return (
                <li key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isRecent ? 'bg-teal-400' : 'bg-zinc-700'}`} />
                    <span className="text-sm text-zinc-300 truncate">{m.users.name}</span>
                    {m.role === 'owner' && <span className="text-[10px] text-zinc-600">owner</span>}
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">{timeSince(m.users.last_seen)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
