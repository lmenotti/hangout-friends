import { NextRequest, NextResponse } from 'next/server'

// Batched travel time: one request, multiple destinations.
// Returns an array in the same order as destinations[].
export async function POST(req: NextRequest) {
  const { origin, destinations } = await req.json()
  const key = process.env.GOOGLE_MAPS_API_KEY
  const empty = (destinations as string[]).map(() => ({ car: null, transit: null, walk: null }))

  if (!key || !origin?.trim() || !destinations?.length) {
    return NextResponse.json(empty)
  }

  const orig = encodeURIComponent(origin.trim())
  const dests = (destinations as string[]).map((d) => encodeURIComponent(d.trim())).join('|')
  const base = 'https://maps.googleapis.com/maps/api/distancematrix/json'

  const [carRes, transitRes, walkRes] = await Promise.allSettled([
    fetch(`${base}?origins=${orig}&destinations=${dests}&mode=driving&key=${key}`),
    fetch(`${base}?origins=${orig}&destinations=${dests}&mode=transit&key=${key}`),
    fetch(`${base}?origins=${orig}&destinations=${dests}&mode=walking&key=${key}`),
  ])

  const parseElements = async (res: PromiseSettledResult<Response>): Promise<(number | null)[]> => {
    if (res.status !== 'fulfilled' || !res.value.ok) return (destinations as string[]).map(() => null)
    try {
      const json = await res.value.json()
      return (json?.rows?.[0]?.elements ?? []).map((el: any) => {
        const secs = el?.duration?.value
        return typeof secs === 'number' ? Math.round(secs / 60) : null
      })
    } catch {
      return (destinations as string[]).map(() => null)
    }
  }

  const [carTimes, transitTimes, walkTimes] = await Promise.all([
    parseElements(carRes), parseElements(transitRes), parseElements(walkRes),
  ])

  const result = (destinations as string[]).map((_: string, i: number) => ({
    car: carTimes[i] ?? null,
    transit: transitTimes[i] ?? null,
    walk: walkTimes[i] !== null && (walkTimes[i] as number) <= 25 ? walkTimes[i] : null,
  }))

  return NextResponse.json(result)
}
