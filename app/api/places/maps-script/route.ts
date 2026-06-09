import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ error: 'Maps not configured' }, { status: 503 })

  const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`
  return NextResponse.json({ src })
}
