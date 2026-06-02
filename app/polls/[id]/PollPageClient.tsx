'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import PollGrid, { formatSlotLabel } from '@/components/PollGrid'
import PollIdeasBoard, { type PollIdea } from '@/components/PollIdeasBoard'
import { formatScheduledLabel } from '@/lib/formatScheduledLabel'
import { buildGoogleCalendarUrl, calendarEventFromPoll } from '@/lib/ics'
import { useUser } from '@/context/UserContext'
import type { PlanPageInitialData, PlanPagePoll, PlanPageResponse, PlanPageRsvp } from '@/lib/planPageTypes'

type Poll = PlanPagePoll
type Response = PlanPageResponse
type PollRsvp = PlanPageRsvp
type ScheduledIdea = { id: string; title: string; location: string | null }
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type SchedulePickerOption = {
  rank: number
  idea_id: string
  idea_title: string
  slot_key: string
  scheduled_at: string
  reason: string
  voter_count: number
  total_available: number
}

// Returns the set of 30-min slots (9am–9pm) across the given dates that are NOT
// covered by any busy interval from Google Calendar. Uses local clock for slot
// construction so the result matches the plan grid's naive date+hour keys.
function calendarAvailableSlots(
  dates: string[],
  busyIntervals: { start: string; end: string }[],
): Set<string> {
  const available = new Set<string>()
  for (const date of dates) {
    for (let hour = 9; hour < 21; hour++) {
      for (const minute of [0, 30] as const) {
        const slotStart = new Date(
          `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
        )
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
        const isBusy = busyIntervals.some(({ start, end }) => {
          return slotStart < new Date(end) && slotEnd > new Date(start)
        })
        if (!isBusy) available.add(`${date}-${hour}-${minute}`)
      }
    }
  }
  return available
}

function computeAggregate(responses: Response[]): Record<string, number> {
  const aggregate: Record<string, number> = {}
  for (const r of responses) {
    for (const [slot, free] of Object.entries(r.availability ?? {})) {
      if (free) aggregate[slot] = (aggregate[slot] ?? 0) + 1
    }
  }
  return aggregate
}

export default function PollPageClient({
  id,
  autoFillAvailability = false,
  initialData,
}: {
  id: string
  autoFillAvailability?: boolean
  initialData?: PlanPageInitialData
}) {
  const [poll, setPoll] = useState<Poll | null>(initialData?.poll ?? null)
  const [scheduledIdea, setScheduledIdea] = useState<ScheduledIdea | null>(
    initialData?.scheduled_idea ?? null,
  )
  const [responses, setResponses] = useState<Response[]>(initialData?.responses ?? [])
  const [rsvps, setRsvps] = useState<PollRsvp[]>(initialData?.rsvps ?? [])
  const [ideas, setIdeas] = useState<PollIdea[]>(initialData?.ideas ?? [])
  const [aggregate, setAggregate] = useState<Record<string, number>>(initialData?.aggregate ?? {})
  const [loading, setLoading] = useState(!initialData)
  const [isCreator, setIsCreator] = useState(initialData?.is_creator ?? false)

  const [name, setName] = useState('')
  const [mySlots, setMySlots] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [nameRequired, setNameRequired] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleOptions, setScheduleOptions] = useState<SchedulePickerOption[] | null>(null)
  const [selectedScheduleKey, setSelectedScheduleKey] = useState<string | null>(null)
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [inspectedSlot, setInspectedSlot] = useState<string | null>(null)
  const [heatmapFilter, setHeatmapFilter] = useState<'all' | '80plus' | 'everyone'>('all')
  const [linkCopied, setLinkCopied] = useState(false)
  const [editingCreatorName, setEditingCreatorName] = useState(false)
  const [creatorNameDraft, setCreatorNameDraft] = useState('')
  const [creatorNameSaving, setCreatorNameSaving] = useState(false)

  const [calendarBaseline, setCalendarBaseline] = useState<Set<string> | null>(null)
  const [calendarFetching, setCalendarFetching] = useState(false)

  const { token } = useUser()

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const skipNextSaveRef = useRef(false)
  const saveInFlightRef = useRef(false)
  const identityHydratedRef = useRef(false)
  const openFillFromCreateRef = useRef(autoFillAvailability)
  const calendarFetchedRef = useRef(false)

  const applyReturningIdentity = useCallback((
    identity: string | null | undefined,
    pollResponses: Response[],
  ) => {
    if (!identity?.trim() || identityHydratedRef.current) return
    identityHydratedRef.current = true

    const trimmed = identity.trim()
    setName(trimmed)

    const existing = pollResponses.find(
      r => r.respondent_name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) {
      skipNextSaveRef.current = true
      const slots = new Set(
        Object.entries(existing.availability).filter(([, v]) => v).map(([k]) => k),
      )
      setMySlots(slots)
    }
  }, [])

  const fetchPoll = useCallback(async (options?: { heatmapOnly?: boolean }) => {
    const res = await fetch(`/api/polls/${id}`)
    if (!res.ok) return
    const data = await res.json()

    if (options?.heatmapOnly) {
      setResponses(data.responses)
      setAggregate(data.aggregate)
      setRsvps(data.rsvps ?? [])
      return
    }

    setPoll(data.poll)
    setResponses(data.responses)
    setAggregate(data.aggregate)
    setRsvps(data.rsvps ?? [])
    setScheduledIdea(data.scheduled_idea ?? null)
    setIsCreator(data.is_creator ?? false)
    applyReturningIdentity(data.plan_identity, data.responses)
  }, [id, applyReturningIdentity])

  const fetchIdeas = useCallback(async () => {
    const res = await fetch(`/api/polls/${id}/ideas`)
    if (!res.ok) return
    setIdeas(await res.json())
  }, [id])

  useEffect(() => {
    const storedTapMode = localStorage.getItem('poll_tap_mode')
    if (storedTapMode !== null) {
      setTapMode(storedTapMode === '1')
    } else if (window.matchMedia('(max-width: 768px)').matches) {
      setTapMode(true)
    }

    if (initialData) {
      applyReturningIdentity(initialData.plan_identity, initialData.responses)
      return
    }

    Promise.all([fetchPoll(), fetchIdeas()]).finally(() => setLoading(false))
  }, [fetchPoll, fetchIdeas, initialData, applyReturningIdentity])

  // After plan creation (?fill=1), open the grid once identity cookie + name are ready.
  useEffect(() => {
    if (!openFillFromCreateRef.current || loading || poll?.status === 'scheduled') return
    if (!name.trim()) return
    openFillFromCreateRef.current = false
    setEditing(true)
  }, [loading, name, poll?.status])

  // Reset the calendar fetch guard when editing closes so re-opening the grid
  // after a calendar change (webhook-invalidated cache) picks up fresh data.
  useEffect(() => {
    if (!editing) calendarFetchedRef.current = false
  }, [editing])

  // When editing starts for a signed-in user, fetch their Google Calendar busy times and
  // pre-fill the grid. Guarded by calendarFetchedRef to prevent duplicate fetches within
  // a single edit session; reset above when editing closes.
  useEffect(() => {
    if (!editing || !token || !poll || calendarFetchedRef.current) return
    calendarFetchedRef.current = true

    const dates = poll.date_options
    if (!dates?.length) return

    setCalendarFetching(true)

    const timeMin = new Date(`${dates[0]}T00:00:00`).toISOString()
    const timeMax = new Date(`${dates[dates.length - 1]}T23:59:59`).toISOString()

    fetch(
      `/api/calendar/sync?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      { headers: { 'x-user-token': token } },
    )
      .then(r => (r.ok ? r.json() : null))
      .then((data: { connected: boolean; busy?: { start: string; end: string }[] } | null) => {
        if (!data?.connected || !data.busy) return
        const baseline = calendarAvailableSlots(dates, data.busy)
        setCalendarBaseline(baseline)
        // Pre-fill only when the user has no existing response (mySlots is still empty).
        setMySlots(prev => (prev.size > 0 ? prev : baseline))
      })
      .catch(() => {})
      .finally(() => setCalendarFetching(false))
  }, [editing, token, poll])

  const persistAvailability = useCallback(async (slots: Set<string>, respondentName: string) => {
    if (!respondentName.trim() || saveInFlightRef.current) return

    saveInFlightRef.current = true
    setSaveStatus('saving')
    setError('')

    const availability: Record<string, boolean> = {}
    for (const key of slots) availability[key] = true

    try {
      const res = await fetch(`/api/polls/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ respondent_name: respondentName.trim(), availability }),
      })

      if (res.ok) {
        const saved = (await res.json()) as Response
        setResponses(prev => {
          const idx = prev.findIndex(
            r => r.id === saved.id
              || r.respondent_name.toLowerCase() === saved.respondent_name.toLowerCase(),
          )
          const next = [...prev]
          if (idx >= 0) next[idx] = saved
          else next.push(saved)
          setAggregate(computeAggregate(next))
          return next
        })
        setSaveStatus('saved')
        clearTimeout(savedFadeRef.current)
        savedFadeRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Could not save your availability.')
        setSaveStatus('error')
      }
    } finally {
      saveInFlightRef.current = false
    }
  }, [id])

  useEffect(() => {
    if (!editing || !name.trim() || poll?.status === 'scheduled') return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      void persistAvailability(mySlots, name.trim())
    }, 900)

    return () => clearTimeout(saveTimeoutRef.current)
  }, [mySlots, editing, name, poll?.status, persistAvailability])

  useEffect(() => () => {
    clearTimeout(saveTimeoutRef.current)
    clearTimeout(savedFadeRef.current)
  }, [])

  const handleToggle = useCallback((key: string, adding: boolean) => {
    setMySlots(prev => {
      if (adding === prev.has(key)) return prev
      const next = new Set(prev)
      adding ? next.add(key) : next.delete(key)
      return next
    })
  }, [])

  const startEditing = () => {
    if (poll?.status === 'scheduled') return
    if (name.trim()) {
      setEditing(true)
    } else {
      setNameRequired(true)
    }
  }

  const getSlotBreakdown = useCallback((slotKey: string) => {
    const free: string[] = []
    const busy: string[] = []
    const noMark: string[] = []
    for (const r of responses) {
      const v = r.availability?.[slotKey]
      if (v === true) free.push(r.respondent_name)
      else if (v === false) busy.push(r.respondent_name)
      else noMark.push(r.respondent_name)
    }
    return { free, busy, noMark }
  }, [responses])

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setNameRequired(false)
    if (poll?.status !== 'scheduled') setEditing(true)
  }

  const scheduleOptionKey = (option: SchedulePickerOption) =>
    `${option.idea_id}:${option.slot_key}`

  const handleAutoSchedule = async () => {
    setScheduling(true)
    setError('')
    setScheduleOptions(null)
    setSelectedScheduleKey(null)
    try {
      const res = await fetch(`/api/polls/${id}/schedule`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const options = (data.candidates ?? []) as SchedulePickerOption[]
      if (options.length === 0) throw new Error('No schedule options found')
      setScheduleOptions(options)
      setSelectedScheduleKey(scheduleOptionKey(options[0]))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load schedule options')
    } finally {
      setScheduling(false)
    }
  }

  const handleConfirmSchedule = async () => {
    const selected = scheduleOptions?.find(o => scheduleOptionKey(o) === selectedScheduleKey)
    if (!selected) return

    setScheduling(true)
    setError('')
    try {
      const res = await fetch(`/api/polls/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_key: selected.slot_key, idea_id: selected.idea_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScheduleOptions(null)
      setSelectedScheduleKey(null)
      await Promise.all([fetchPoll(), fetchIdeas()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not confirm schedule')
    } finally {
      setScheduling(false)
    }
  }

  const handleRsvp = async (status: 'yes' | 'maybe' | 'no') => {
    if (!name.trim()) {
      setNameRequired(true)
      return
    }
    setRsvpSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/polls/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondent_name: name.trim(), status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchPoll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save RSVP')
    } finally {
      setRsvpSubmitting(false)
    }
  }

  const saveStatusLabel = saveStatus === 'saving'
    ? 'Saving…'
    : saveStatus === 'saved'
      ? 'Saved'
      : saveStatus === 'error'
        ? 'Save failed'
        : null

  const bestTimes = Object.entries(aggregate)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, count]) => {
      const parts = key.split('-')
      const date = parts.slice(0, 3).join('-')
      const hour = parseInt(parts[3])
      const minute = parseInt(parts[4]) as 0 | 30
      const label = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
        .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      return { label, count }
    })

  const [copied, setCopied] = useState(false)
  const copyLink = () => {
   
    void navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
 .then(() => {
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const saveCreatorName = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = creatorNameDraft.trim()
    if (!trimmed) return
    setCreatorNameSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/polls/${id}/creator-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoll(p => (p ? { ...p, creator_name: data.creator_name } : p))
      setName(data.creator_name)
      identityHydratedRef.current = true
      setEditingCreatorName(false)
      await fetchPoll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update name.')
    } finally {
      setCreatorNameSaving(false)
    }
  }

  const myRsvp = name.trim()
    ? rsvps.find(r => r.respondent_name.toLowerCase() === name.trim().toLowerCase())?.status ?? null
    : null

  const rsvpGroups = {
    yes: rsvps.filter(r => r.status === 'yes'),
    maybe: rsvps.filter(r => r.status === 'maybe'),
    no: rsvps.filter(r => r.status === 'no'),
  }

  const whosComing = [...rsvpGroups.yes, ...rsvpGroups.maybe]

  const isSelfName = (respondentName: string) =>
    !!name.trim() && respondentName.toLowerCase() === name.trim().toLowerCase()

  const renderNameList = (names: string[], emptyLabel: string) => {
    if (names.length === 0) {
      return <span className="text-zinc-600">{emptyLabel}</span>
    }
    return (
      <span>
        {names.map((n, i) => (
          <span key={n}>
            {i > 0 && ', '}
            <span className={isSelfName(n) ? 'text-indigo-300 font-medium' : 'text-zinc-300'}>{n}</span>
          </span>
        ))}
      </span>
    )
  }

  const inspectedBreakdown = inspectedSlot ? getSlotBreakdown(inspectedSlot) : null

  const isScheduled = poll?.status === 'scheduled'
  const scheduledLabel = poll?.scheduled_at
    ? formatScheduledLabel(new Date(poll.scheduled_at))
    : null

  const calendarEvent = poll
    ? calendarEventFromPoll({
        pollId: poll.id,
        title: poll.title,
        creatorName: poll.creator_name,
        scheduledAt: poll.scheduled_at,
        scheduledEndAt: poll.scheduled_end_at,
        ideaTitle: scheduledIdea?.title ?? null,
        location: scheduledIdea?.location ?? null,
        planUrl: typeof window !== 'undefined' ? window.location.href : null,
      })
    : null
  const googleCalendarUrl = calendarEvent ? buildGoogleCalendarUrl(calendarEvent) : null

  if (loading) return <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />
  if (!poll) return <p className="text-zinc-500">Poll not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{poll.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Created by {poll.creator_name} · {responses.length} response{responses.length !== 1 ? 's' : ''}
          </p>
          {isCreator && !editingCreatorName && (
            <button
              type="button"
              onClick={() => {
                setCreatorNameDraft(poll.creator_name)
                setEditingCreatorName(true)
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 touch-manipulation"
            >
              Fix your name typo
            </button>
          )}
          {isCreator && editingCreatorName && (
            <form onSubmit={saveCreatorName} className="flex gap-2 mt-2 flex-wrap items-center">
              <input
                value={creatorNameDraft}
                onChange={e => setCreatorNameDraft(e.target.value)}
                maxLength={40}
                autoComplete="given-name"
                className="flex-1 min-w-[8rem] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={creatorNameSaving || !creatorNameDraft.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white disabled:opacity-40"
              >
                {creatorNameSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCreatorName(false)}
                className="px-2 py-2 text-xs text-zinc-500"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation min-h-[44px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {isScheduled && scheduledLabel && (
        <div className="bg-teal-950/40 border border-teal-800/60 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-teal-400">Scheduled</p>
            <p className="text-lg font-semibold text-zinc-100 mt-1">{scheduledLabel}</p>
            {scheduledIdea && (
              <p className="text-sm text-zinc-400 mt-1">
                {scheduledIdea.title}
                {scheduledIdea.location ? ` · ${scheduledIdea.location}` : ''}
              </p>
            )}
          </div>

          {calendarEvent && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/polls/${id}/ics`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors touch-manipulation min-h-[44px]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
                  </svg>
                  Add to my calendar
                </a>
                {googleCalendarUrl && (
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors touch-manipulation min-h-[44px]"
                  >
                    Add to Google Calendar
                  </a>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Downloads an .ics file — works in Apple Calendar, Outlook, and more.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Are you coming?
              {myRsvp && (
                <span className="text-indigo-300"> · You said {myRsvp}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['yes', 'maybe', 'no'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={rsvpSubmitting}
                  onClick={() => handleRsvp(status)}
                  aria-pressed={myRsvp === status}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors touch-manipulation min-h-[44px] min-w-[72px] ${
                    myRsvp === status
                      ? status === 'yes'
                        ? 'bg-teal-600 text-white ring-2 ring-teal-400/60'
                        : status === 'maybe'
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/60'
                          : 'bg-zinc-600 text-white ring-2 ring-zinc-400/60'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  } disabled:opacity-40`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {(whosComing.length > 0 || rsvps.length > 0) && (
            <div className="space-y-3 pt-2 border-t border-teal-800/40">
              {whosComing.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-400 mb-1.5">Who&apos;s coming</p>
                  <p className="text-sm leading-relaxed">
                    {whosComing.map((r, i) => (
                      <span key={r.respondent_name}>
                        {i > 0 && ', '}
                        <span className={isSelfName(r.respondent_name) ? 'text-indigo-300 font-medium' : 'text-zinc-100'}>
                          {r.respondent_name}
                          {r.status === 'maybe' && <span className="text-zinc-500 font-normal"> (maybe)</span>}
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-teal-400 mb-1">
                    Yes <span className="text-zinc-500">({rsvpGroups.yes.length})</span>
                  </p>
                  <p className="text-sm leading-relaxed">{renderNameList(rsvpGroups.yes.map(r => r.respondent_name), 'No one yet')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">
                    Maybe <span className="text-zinc-500">({rsvpGroups.maybe.length})</span>
                  </p>
                  <p className="text-sm leading-relaxed">{renderNameList(rsvpGroups.maybe.map(r => r.respondent_name), 'No one yet')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">
                    No <span className="text-zinc-600">({rsvpGroups.no.length})</span>
                  </p>
                  <p className="text-sm leading-relaxed">{renderNameList(rsvpGroups.no.map(r => r.respondent_name), 'No one yet')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {nameRequired && (
        <form onSubmit={handleNameSubmit} className="flex gap-3 items-center bg-zinc-900 border border-indigo-500/40 rounded-2xl px-4 py-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            maxLength={40}
            autoComplete="given-name"
            inputMode="text"
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-base min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors touch-manipulation min-h-[44px]"
          >
            Go
          </button>
          <button
            type="button"
            onClick={() => setNameRequired(false)}
            className="px-2 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors touch-manipulation min-h-[44px]"
          >
            Cancel
          </button>
        </form>
      )}

      {!isScheduled && editing && (
        <div className="flex gap-3 items-center">
          <span className="text-sm text-zinc-400 flex-1 truncate">
            Marking as <span className="text-zinc-200 font-medium">{name}</span>
          </span>
          {saveStatusLabel && (
            <span className={`text-xs font-medium shrink-0 ${
              saveStatus === 'saved' ? 'text-teal-400' : saveStatus === 'error' ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {saveStatusLabel}
            </span>
          )}
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2.5 text-sm rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors touch-manipulation min-h-[44px]"
          >
            Done
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!isScheduled && !editing && (
        <button
          type="button"
          onClick={startEditing}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors touch-manipulation min-h-[48px]"
        >
          {responses.find(r => r.respondent_name.toLowerCase() === name.trim().toLowerCase())
            ? 'Edit my availability'
            : 'Mark your availability'}
        </button>
      )}

      {!isScheduled && editing && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {tapMode ? 'Tap cells to toggle. Changes save automatically.' : 'Drag to mark when you\'re free. Changes save automatically.'}
          </p>
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => { setTapMode(false); localStorage.setItem('poll_tap_mode', '0') }}
              className={`px-3 py-2.5 min-h-[44px] transition-colors touch-manipulation ${!tapMode ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Drag
            </button>
            <button
              type="button"
              onClick={() => { setTapMode(true); localStorage.setItem('poll_tap_mode', '1') }}
              className={`px-3 py-2.5 min-h-[44px] transition-colors touch-manipulation ${tapMode ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Tap
            </button>
          </div>
        </div>
      )}

      {!isScheduled && editing && (calendarBaseline !== null || calendarFetching) && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3.5 h-3.5 shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {calendarFetching ? 'Loading from Google Calendar…' : 'Pre-filled from Google Calendar'}
          </span>
          {calendarBaseline !== null && (
            <button
              type="button"
              onClick={() => setMySlots(new Set(calendarBaseline))}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors touch-manipulation px-2 py-2.5 min-h-[44px] shrink-0"
            >
              Revert to calendar
            </button>
          )}
        </div>
      )}

      {!isScheduled && responses.length > 0 && !editing && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setHeatmapFilter(f => (f === 'everyone' ? 'all' : 'everyone'))}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors touch-manipulation min-h-[44px] border ${
              heatmapFilter === 'everyone'
                ? 'bg-teal-950/60 border-teal-700 text-teal-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {heatmapFilter === 'everyone' ? 'Showing everyone free' : 'Everyone free'}
          </button>
          <button
            type="button"
            onClick={() => setHeatmapFilter(f => (f === '80plus' ? 'all' : '80plus'))}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors touch-manipulation min-h-[44px] border ${
              heatmapFilter === '80plus'
                ? 'bg-teal-950/60 border-teal-700 text-teal-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {heatmapFilter === '80plus' ? 'Showing mostly free' : 'Mostly free'}
          </button>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
        <PollGrid
          dates={poll.date_options}
          mySlots={mySlots}
          aggregate={aggregate}
          totalResponders={responses.length}
          editing={editing && !isScheduled}
          onToggle={handleToggle}
          tapMode={tapMode}
          onCellInspect={!editing && responses.length > 0 ? setInspectedSlot : undefined}
          highlightThreshold={
            heatmapFilter === 'everyone' ? 1 : heatmapFilter === '80plus' ? 0.8 : null
          }
        />
        {!editing && !isScheduled && (
          <p className="text-center text-xs text-zinc-600 mt-3">
            Tap a cell to see who&apos;s free · Use the button above to mark your times
          </p>
        )}
        {!editing && isScheduled && responses.length > 0 && (
          <p className="text-center text-xs text-zinc-600 mt-3">
            Tap a cell to see who&apos;s free
          </p>
        )}
      </div>

      {!isScheduled && (
        <>
          <PollIdeasBoard
            pollId={id}
            name={name}
            ideas={ideas}
            disabled={false}
            onIdeasChange={fetchIdeas}
            onNeedName={() => setNameRequired(true)}
          />

          {isCreator && !scheduleOptions ? (
            <button
              type="button"
              onClick={handleAutoSchedule}
              disabled={scheduling || ideas.length === 0 || responses.length === 0}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors touch-manipulation min-h-[48px]"
            >
              {scheduling ? 'Finding options…' : 'Auto-schedule'}
            </button>
          ) : scheduleOptions ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-zinc-300">Pick a time</h2>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleOptions(null)
                    setSelectedScheduleKey(null)
                  }}
                  className="px-3 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors touch-manipulation min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
              <ul className="space-y-2">
                {scheduleOptions.map(option => {
                  const key = scheduleOptionKey(option)
                  const selected = selectedScheduleKey === key
                  const timeLabel = formatScheduledLabel(new Date(option.scheduled_at))
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setSelectedScheduleKey(key)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-colors touch-manipulation min-h-[44px] ${
                          selected
                            ? 'border-indigo-500 bg-indigo-950/50 ring-2 ring-indigo-500/40'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-100">{option.idea_title}</p>
                            <p className="text-sm text-zinc-400 mt-0.5">{timeLabel}</p>
                            <p className="text-xs text-zinc-500 mt-1.5">{option.reason}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-indigo-300 tabular-nums">
                            #{option.rank}
                          </span>
                        </div>
                        <p className="text-xs text-teal-400/90 mt-2">
                          {option.total_available} free · {option.voter_count} voted
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={scheduling || !selectedScheduleKey}
                className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-sm font-medium transition-colors touch-manipulation min-h-[48px]"
              >
                {scheduling ? 'Locking in…' : 'Confirm this time'}
              </button>
            </div>
          ) : null}
          {!scheduleOptions && isCreator && (
            <p className="text-xs text-zinc-600 text-center -mt-4">
              Shows top matches by overlap (needs ideas with 2+ votes).
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        {editing && !isScheduled && (
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Your selection</div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {['bg-teal-900','bg-teal-700','bg-teal-500','bg-teal-400','bg-teal-300'].map(c => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          Group availability
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {bestTimes.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Best times</h2>
            <ul className="space-y-2">
              {bestTimes.map(({ label, count }, i) => (
                <li key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-xs text-teal-400 font-medium shrink-0">{count} / {responses.length}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {responses.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-3">Responses</h2>
            <ul className="space-y-1.5">
              {responses.map(r => (
                <li key={r.id} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  {r.respondent_name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {inspectedSlot && inspectedBreakdown && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-inspect-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={() => setInspectedSlot(null)}
          />
          <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Availability</p>
                <h2 id="slot-inspect-title" className="text-base font-semibold text-zinc-100 mt-0.5">
                  {formatSlotLabel(inspectedSlot)}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {inspectedBreakdown.free.length} of {responses.length} free
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSlot(null)}
                className="px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors touch-manipulation min-h-[44px]"
              >
                Done
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-teal-400 mb-1.5">
                  Free ({inspectedBreakdown.free.length})
                </p>
                {inspectedBreakdown.free.length > 0 ? (
                  <ul className="space-y-1">
                    {inspectedBreakdown.free.map(n => (
                      <li key={n} className={`text-sm ${isSelfName(n) ? 'text-indigo-300 font-medium' : 'text-zinc-200'}`}>
                        {n}{isSelfName(n) ? ' (you)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-600">No one marked free for this slot</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-amber-400/90 mb-1.5">
                  Busy ({inspectedBreakdown.busy.length})
                </p>
                {inspectedBreakdown.busy.length > 0 ? (
                  <ul className="space-y-1">
                    {inspectedBreakdown.busy.map(n => (
                      <li key={n} className={`text-sm ${isSelfName(n) ? 'text-indigo-300/80 font-medium' : 'text-zinc-400'}`}>
                        {n}{isSelfName(n) ? ' (you)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-600">No one marked busy for this time</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1.5">
                  No mark for this time ({inspectedBreakdown.noMark.length})
                </p>
                {inspectedBreakdown.noMark.length > 0 ? (
                  <ul className="space-y-1">
                    {inspectedBreakdown.noMark.map(n => (
                      <li key={n} className={`text-sm ${isSelfName(n) ? 'text-indigo-300/80 font-medium' : 'text-zinc-500'}`}>
                        {n}{isSelfName(n) ? ' (you)' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-600">Everyone who responded picked free or busy</p>
                )}
              </div>

              <p className="text-xs text-zinc-600 pt-1">
                Friends who haven&apos;t opened the link yet won&apos;t appear here.
              </p>

              {responses.length === 0 && (
                <p className="text-sm text-zinc-600">No responses yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
