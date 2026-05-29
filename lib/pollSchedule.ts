import { geocodeLocation, fetchWeatherMap, lookupWeatherScore } from '@/lib/weather'

const START_HOUR = 9
const END_HOUR = 21

export type PollResponseRow = {
  respondent_name: string
  availability: Record<string, boolean>
}

export type PollIdeaRow = {
  id: string
  title: string
  location: string | null
  is_outdoor: boolean | null
  duration_minutes: number | null
  voter_names: string[]
}

export type ScheduleCandidate = {
  ideaId: string
  ideaTitle: string
  slotKey: string
  scheduledAt: Date
  scheduledEndAt: Date | null
  voterCount: number
  totalAvailable: number
  weatherScore: number
}

export type RankedScheduleCandidate = ScheduleCandidate & {
  rank: number
  reason: string
}

function slotKeysForDates(dates: string[]): string[] {
  const keys: string[] = []
  for (const date of dates) {
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      keys.push(`${date}-${hour}-0`)
      keys.push(`${date}-${hour}-30`)
    }
  }
  return keys
}

function parseSlotKey(slotKey: string): Date | null {
  const parts = slotKey.split('-')
  if (parts.length < 5) return null
  const date = parts.slice(0, 3).join('-')
  const hour = parseInt(parts[3], 10)
  const minute = parseInt(parts[4], 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
}

function isAvailable(responses: PollResponseRow[], name: string, slotKey: string): boolean {
  const row = responses.find(r => r.respondent_name.toLowerCase() === name.toLowerCase())
  return Boolean(row?.availability?.[slotKey])
}

function countAvailable(responses: PollResponseRow[], slotKey: string): number {
  return responses.filter(r => r.availability?.[slotKey]).length
}

function compareCandidates(a: ScheduleCandidate, b: ScheduleCandidate): number {
  const scoreA = a.totalAvailable * 100 + a.voterCount * 10 + a.weatherScore
  const scoreB = b.totalAvailable * 100 + b.voterCount * 10 + b.weatherScore
  if (scoreB !== scoreA) return scoreB - scoreA
  return a.scheduledAt.getTime() - b.scheduledAt.getTime()
}

export function buildScheduleReason(candidate: ScheduleCandidate, totalResponders: number): string {
  const timeLabel = formatScheduledLabel(candidate.scheduledAt)
  const freeLabel = totalResponders > 0
    ? `${candidate.totalAvailable}/${totalResponders} free`
    : `${candidate.totalAvailable} free`
  return `${freeLabel}, ${timeLabel}, ${candidate.ideaTitle}`
}

async function collectScheduleCandidates(params: {
  dateOptions: string[]
  responses: PollResponseRow[]
  ideas: PollIdeaRow[]
}): Promise<ScheduleCandidate[]> {
  const { dateOptions, responses, ideas } = params
  const slotKeys = slotKeysForDates(dateOptions)
  const candidates: ScheduleCandidate[] = []

  for (const idea of ideas) {
    const voters = idea.voter_names
    if (voters.length < 2) continue

    for (const slotKey of slotKeys) {
      if (!voters.every(v => isAvailable(responses, v, slotKey))) continue

      const scheduledAt = parseSlotKey(slotKey)
      if (!scheduledAt || scheduledAt.getTime() < Date.now()) continue

      let scheduledEndAt: Date | null = null
      if (idea.duration_minutes) {
        scheduledEndAt = new Date(scheduledAt)
        scheduledEndAt.setMinutes(scheduledEndAt.getMinutes() + idea.duration_minutes)
      }

      candidates.push({
        ideaId: idea.id,
        ideaTitle: idea.title,
        slotKey,
        scheduledAt,
        scheduledEndAt,
        voterCount: voters.length,
        totalAvailable: countAvailable(responses, slotKey),
        weatherScore: 5,
      })
    }
  }

  if (candidates.length === 0) return []

  const outdoorWithLocation = ideas.filter(i => i.is_outdoor && i.location?.trim())
  if (outdoorWithLocation.length > 0) {
    const weatherByIdea = new Map<string, Map<string, number>>()
    for (const idea of outdoorWithLocation) {
      const coords = await geocodeLocation(idea.location!)
      if (!coords) continue
      weatherByIdea.set(idea.id, await fetchWeatherMap(coords.lat, coords.lon))
    }
    for (const c of candidates) {
      const map = weatherByIdea.get(c.ideaId)
      if (map && map.size > 0) {
        c.weatherScore = lookupWeatherScore(map, c.scheduledAt)
      }
    }
  }

  candidates.sort(compareCandidates)
  return candidates
}

export async function findTopPollScheduleCandidates(
  params: {
    dateOptions: string[]
    responses: PollResponseRow[]
    ideas: PollIdeaRow[]
  },
  limit = 3,
): Promise<RankedScheduleCandidate[]> {
  const { responses } = params
  const sorted = await collectScheduleCandidates(params)
  const totalResponders = responses.length

  return sorted.slice(0, limit).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    reason: buildScheduleReason(candidate, totalResponders),
  }))
}

export async function findBestPollSchedule(params: {
  dateOptions: string[]
  responses: PollResponseRow[]
  ideas: PollIdeaRow[]
}): Promise<ScheduleCandidate | null> {
  const top = await findTopPollScheduleCandidates(params, 1)
  return top[0] ?? null
}

export function formatScheduledLabel(scheduledAt: Date): string {
  return scheduledAt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
