import { NextResponse } from 'next/server'

export const LAST_PLAN_SLUG_COOKIE = 'hangout_last_plan'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type CookieReader = {
  get: (name: string) => { value: string } | undefined
}

export function appendLastPlanSlugCookie(res: NextResponse, slug: string): void {
  const trimmed = slug.trim()
  if (!trimmed) return
  res.cookies.set({
    name: LAST_PLAN_SLUG_COOKIE,
    value: trimmed,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function getLastPlanSlugFromCookies(cookieStore: CookieReader): string | null {
  const raw = cookieStore.get(LAST_PLAN_SLUG_COOKIE)?.value?.trim()
  return raw || null
}
