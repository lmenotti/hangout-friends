import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getLastPlanSlugFromCookies } from '@/lib/lastPlan'

/** Returns the slug of the plan this device last interacted with (httpOnly cookie). */
export async function GET() {
  const cookieStore = await cookies()
  const slug = getLastPlanSlugFromCookies(cookieStore)
  return NextResponse.json({ slug })
}
