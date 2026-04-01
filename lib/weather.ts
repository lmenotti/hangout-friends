// Open-Meteo integration — free, no API key required

type WeatherPoint = { weathercode: number; precipProb: number }

function weatherScore(weathercode: number, precipProb: number): number {
  let penalty = 0
  if (weathercode === 0)      penalty = 0  // clear sky
  else if (weathercode <= 3)  penalty = 1  // partly cloudy
  else if (weathercode <= 48) penalty = 3  // fog
  else if (weathercode <= 67) penalty = 6  // drizzle / rain / freezing rain
  else if (weathercode <= 77) penalty = 5  // snow
  else if (weathercode <= 82) penalty = 6  // rain showers
  else if (weathercode <= 86) penalty = 6  // snow showers
  else                        penalty = 8  // thunderstorm / hail

  return Math.max(0, Math.min(10, 10 - penalty - Math.floor(precipProb / 20)))
}

export async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.results?.[0]
    if (!result) return null
    return { lat: result.latitude, lon: result.longitude }
  } catch {
    return null
  }
}

// Returns a map of ISO hour string ("2026-04-05T14") → weather score (0–10)
export async function fetchWeatherMap(lat: number, lon: number): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weathercode,precipitation_probability&forecast_days=14&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return map
    const json = await res.json()
    const times: string[] = json?.hourly?.time ?? []
    const codes: number[] = json?.hourly?.weathercode ?? []
    const probs: number[] = json?.hourly?.precipitation_probability ?? []
    for (let i = 0; i < times.length; i++) {
      // time format: "2026-04-05T14:00" — store without minutes
      const key = times[i].slice(0, 13)  // "2026-04-05T14"
      map.set(key, weatherScore(codes[i] ?? 0, probs[i] ?? 0))
    }
  } catch {
    // silently return empty map — caller falls back to no weather scoring
  }
  return map
}

// Given a scheduled Date, look up its score in the weather map
export function lookupWeatherScore(weatherMap: Map<string, number>, date: Date): number {
  const key = date.toISOString().slice(0, 13).replace('T', 'T')
  // date.toISOString() is UTC — adjust to local hour
  const localKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + 'T' + String(date.getHours()).padStart(2, '0')
  return weatherMap.get(localKey) ?? weatherMap.get(key) ?? 5
}

export type { WeatherPoint }
