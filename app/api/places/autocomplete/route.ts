import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] })

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ suggestions: [] })

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${key}&types=geocode`
  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ suggestions: [] })

  const data = await res.json()
  const suggestions = (data.predictions ?? [])
    .slice(0, 5)
    .map((p: any) => p.description as string)

  return NextResponse.json({ suggestions })
}
