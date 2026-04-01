'use client'

import { useState } from 'react'

type BugReport = {
  id: string
  title: string
  description: string | null
  reporter_name: string
  reported_at: string
  resolved: boolean
}

type AdminData = {
  users: { id: string; name: string; created_at: string }[]
  ideas: { id: string; title: string; description: string | null; creator_name: string; vote_count: number; created_at: string }[]
  events: { id: string; title: string; scheduled_at: string | null; created_at: string }[]
  bug_reports: BugReport[]
}

type ApprovedName = { id: string; name: string; created_at: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function Row({ label, sub, onDelete }: { label: string; sub?: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="min-w-0">
        <p className="text-sm text-zinc-200 truncate">{label}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {confirming ? (
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setConfirming(false)} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { setConfirming(false); onDelete() }}
            className="text-xs text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-950 border border-red-900 px-3 py-1 rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  )
}

function BugRow({ bug, pin, onUpdate }: { bug: BugReport; pin: string; onUpdate: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const toggleResolved = async () => {
    setToggling(true)
    await fetch(`/api/bug-reports/${bug.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ resolved: !bug.resolved }),
    })
    setToggling(false)
    onUpdate()
  }

  const askClaude = async () => {
    setLoadingSuggestion(true)
    setSuggestion('')
    const res = await fetch('/api/claude-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ title: bug.title, description: bug.description }),
    })
    const data = await res.json()
    setSuggestion(res.ok ? data.suggestion : `Error: ${data.error}`)
    setLoadingSuggestion(false)
  }

  return (
    <div className={`rounded-xl border ${bug.resolved ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm ${bug.resolved ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
              {bug.title}
            </p>
            {bug.resolved && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-500 shrink-0">Resolved</span>
            )}
          </div>
          {bug.description && (
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{bug.description}</p>
          )}
          <p className="text-xs text-zinc-700 mt-1">by {bug.reporter_name} · {formatDate(bug.reported_at)}</p>
        </div>
        <div className="flex gap-1.5 shrink-0 items-start mt-0.5">
          <button
            onClick={askClaude}
            disabled={loadingSuggestion}
            title="Ask Claude for a fix suggestion"
            className="text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40 bg-violet-950/60 text-violet-400 hover:bg-violet-900/60 hover:text-violet-300 border border-violet-900/50"
          >
            {loadingSuggestion ? '…' : 'Claude'}
          </button>
          <button
            onClick={toggleResolved}
            disabled={toggling}
            className={`text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${
              bug.resolved
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/50'
            }`}
          >
            {bug.resolved ? 'Reopen' : 'Resolve'}
          </button>
          {confirming ? (
            <div className="flex gap-1">
              <button onClick={() => setConfirming(false)} className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-1 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirming(false)
                  await fetch('/api/admin', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
                    body: JSON.stringify({ type: 'bug_report', id: bug.id }),
                  })
                  onUpdate()
                }}
                className="text-xs text-red-400 hover:text-red-300 bg-red-950/50 border border-red-900 px-2 py-1 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded-lg transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
      {/* Claude suggestion panel */}
      {suggestion && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-violet-950/30 border border-violet-900/40 text-xs text-violet-200 leading-relaxed whitespace-pre-wrap">
          {suggestion}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [approvedNames, setApprovedNames] = useState<ApprovedName[]>([])
  const [newName, setNewName] = useState('')
  const [addingName, setAddingName] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = async (pinValue: string) => {
    setLoading(true)
    setError('')
    const [adminRes, namesRes] = await Promise.all([
      fetch('/api/admin', { headers: { 'x-admin-pin': pinValue } }),
      fetch('/api/admin/approved-names', { headers: { 'x-admin-pin': pinValue } }),
    ])
    if (!adminRes.ok) {
      setError('Wrong PIN.')
      setLoading(false)
      return
    }
    setData(await adminRes.json())
    setApprovedNames(namesRes.ok ? await namesRes.json() : [])
    setAuthed(true)
    setLoading(false)
  }

  const handleDelete = async (type: string, id: string) => {
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ type, id }),
    })
    fetchData(pin)
  }

  const handleAddName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingName(true)
    await fetch('/api/admin/approved-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    setAddingName(false)
    const res = await fetch('/api/admin/approved-names', { headers: { 'x-admin-pin': pin } })
    if (res.ok) setApprovedNames(await res.json())
  }

  const handleRemoveName = async (id: string) => {
    await fetch('/api/admin/approved-names', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ id }),
    })
    const res = await fetch('/api/admin/approved-names', { headers: { 'x-admin-pin': pin } })
    if (res.ok) setApprovedNames(await res.json())
  }

  if (!authed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-xs space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Admin</h1>
            <p className="text-sm text-zinc-500 mt-1">Enter your admin PIN to continue.</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); fetchData(pin) }} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 tracking-widest"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-sm font-medium py-3 rounded-xl transition-colors"
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  const openBugs = data.bug_reports.filter(b => !b.resolved)
  const resolvedBugs = data.bug_reports.filter(b => b.resolved)

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Admin</h1>
        <button onClick={() => fetchData(pin)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Refresh
        </button>
      </div>

      {/* Approved Names */}
      <Section title="Approved Names">
        <form onSubmit={handleAddName} className="flex gap-2 mb-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Add a name…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={addingName || !newName.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Add
          </button>
        </form>
        {approvedNames.length === 0 && (
          <p className="text-xs text-zinc-600 px-4 py-3">No approved names yet. Add names to allow sign-in.</p>
        )}
        {approvedNames.map(n => (
          <Row key={n.id} label={n.name} onDelete={() => handleRemoveName(n.id)} />
        ))}
      </Section>

      {/* Bug Reports */}
      <Section title={`Bug Reports${openBugs.length > 0 ? ` (${openBugs.length} open)` : ''}`}>
        {data.bug_reports.length === 0 && (
          <p className="text-xs text-zinc-600 px-4 py-3">No bug reports yet.</p>
        )}
        {openBugs.map(b => (
          <BugRow key={b.id} bug={b} pin={pin} onUpdate={() => fetchData(pin)} />
        ))}
        {resolvedBugs.length > 0 && (
          <>
            <p className="text-xs text-zinc-700 uppercase tracking-widest pt-2 pb-1 px-1">Resolved</p>
            {resolvedBugs.map(b => (
              <BugRow key={b.id} bug={b} pin={pin} onUpdate={() => fetchData(pin)} />
            ))}
          </>
        )}
      </Section>

      <Section title={`Members (${data.users.length})`}>
        {data.users.length === 0 && <p className="text-xs text-zinc-600 px-4 py-3">No members yet.</p>}
        {data.users.map(u => (
          <Row key={u.id} label={u.name} sub={`Joined ${formatDate(u.created_at)}`} onDelete={() => handleDelete('user', u.id)} />
        ))}
      </Section>

      <Section title={`Ideas (${data.ideas.length})`}>
        {data.ideas.length === 0 && <p className="text-xs text-zinc-600 px-4 py-3">No ideas yet.</p>}
        {data.ideas.map(i => (
          <Row
            key={i.id}
            label={i.title}
            sub={`by ${i.creator_name} · ${i.vote_count} vote${i.vote_count !== 1 ? 's' : ''} · ${formatDate(i.created_at)}`}
            onDelete={() => handleDelete('idea', i.id)}
          />
        ))}
      </Section>

      <Section title={`Events (${data.events.length})`}>
        {data.events.length === 0 && <p className="text-xs text-zinc-600 px-4 py-3">No events yet.</p>}
        {data.events.map(e => (
          <Row
            key={e.id}
            label={e.title}
            sub={e.scheduled_at ? formatDate(e.scheduled_at) : 'No date set'}
            onDelete={() => handleDelete('event', e.id)}
          />
        ))}
      </Section>
    </div>
  )
}
