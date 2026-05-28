// Pure helpers for one-shot calendar export (ICS file + Google Calendar URL).
// No server-only dependencies — safe to import in both Route Handlers and
// Client Components. This is a one-way export, not a sync (see PRODUCT.md #11).

export type CalendarEvent = {
  uid: string
  title: string
  start: Date
  end: Date
  location?: string | null
  description?: string | null
  organizerName?: string | null
}

// Format a Date as a UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ.
// We emit UTC instants so Apple/Google Calendar render them in the viewer's
// local zone, matching how the app displays scheduled times (toLocaleString).
function formatUtcStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

// Escape text per RFC 5545 §3.3.11 (backslash, comma, semicolon, newlines).
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n')
}

// Fold lines longer than 75 octets per RFC 5545 §3.1. Continuation lines start
// with a single space. We approximate octets with UTF-8 byte length.
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chars = Array.from(line)
  const segments: string[] = []
  let current = ''
  let currentBytes = 0
  let isContinuation = false

  for (const ch of chars) {
    const chBytes = encoder.encode(ch).length
    // Continuation lines carry a leading space, so their budget is 74 octets.
    const limit = isContinuation ? 74 : 75
    if (currentBytes + chBytes > limit) {
      segments.push(isContinuation ? ` ${current}` : current)
      current = ''
      currentBytes = 0
      isContinuation = true
    }
    current += ch
    currentBytes += chBytes
  }
  if (current) segments.push(isContinuation ? ` ${current}` : current)

  return segments.join('\r\n')
}

export function buildIcsCalendar(event: CalendarEvent): string {
  const now = new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hangout//Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART:${formatUtcStamp(event.start)}`,
    `DTEND:${formatUtcStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]

  if (event.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(event.location.trim())}`)
  }
  if (event.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`)
  }
  if (event.organizerName?.trim()) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(event.organizerName.trim())}:MAILTO:noreply@hangout-friends.app`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatUtcStamp(event.start)}/${formatUtcStamp(event.end)}`,
  })
  if (event.location?.trim()) params.set('location', event.location.trim())
  if (event.description?.trim()) params.set('details', event.description.trim())

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Derive a CalendarEvent from a scheduled poll and its winning activity.
// Returns null if the poll has no scheduled start time.
export function calendarEventFromPoll(params: {
  pollId: string
  title: string
  creatorName: string
  scheduledAt: string | null
  scheduledEndAt: string | null
  ideaTitle?: string | null
  location?: string | null
  planUrl?: string | null
}): CalendarEvent | null {
  if (!params.scheduledAt) return null

  const start = new Date(params.scheduledAt)
  if (Number.isNaN(start.getTime())) return null

  let end = params.scheduledEndAt ? new Date(params.scheduledEndAt) : null
  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    // Default to a one-hour block when no end time was scheduled.
    end = new Date(start.getTime() + 60 * 60 * 1000)
  }

  const descriptionParts: string[] = []
  if (params.ideaTitle?.trim()) descriptionParts.push(`Activity: ${params.ideaTitle.trim()}`)
  descriptionParts.push(`Organized by ${params.creatorName} via Hangout.`)
  if (params.planUrl?.trim()) descriptionParts.push(params.planUrl.trim())

  return {
    uid: `poll-${params.pollId}@hangout-friends.app`,
    title: params.title,
    start,
    end,
    location: params.location ?? null,
    description: descriptionParts.join('\n'),
    organizerName: params.creatorName,
  }
}
