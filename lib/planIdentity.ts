import { NextRequest, NextResponse } from 'next/server'

type CookieReader = {
  get: (name: string) => { value: string } | undefined
}

/** Per-plan anonymous respondent name — scoped to one poll, not global auth. */
const COOKIE_PREFIX = 'hangout_plan_'
export const PLAN_IDENTITY_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, aligned with plan expiry
export const PLAN_IDENTITY_NAME_MAX_LEN = 40

export function planIdentityCookieName(pollId: string): string {
  return `${COOKIE_PREFIX}${pollId}`
}

/** First name only — first whitespace-delimited token. */
export function normalizePlanIdentityName(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const first = trimmed.split(/\s+/)[0] ?? ''
  if (!first) return null
  return first.slice(0, PLAN_IDENTITY_NAME_MAX_LEN)
}

export function getPlanIdentityFromCookies(
  cookieStore: CookieReader,
  pollId: string,
): string | null {
  const raw = cookieStore.get(planIdentityCookieName(pollId))?.value
  if (!raw) return null
  try {
    return normalizePlanIdentityName(decodeURIComponent(raw))
  } catch {
    return normalizePlanIdentityName(raw)
  }
}

export function getPlanIdentityFromRequest(req: NextRequest, pollId: string): string | null {
  return getPlanIdentityFromCookies(req.cookies, pollId)
}

type CookieStoreWithGetAll = CookieReader & {
  getAll: () => { name: string; value: string }[]
}

/** All respondent names stored in plan identity cookies on this device. */
export function getAllPlanIdentityNamesFromCookies(cookieStore: CookieStoreWithGetAll): string[] {
  const names: string[] = []
  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith(COOKIE_PREFIX)) continue
    try {
      const name = normalizePlanIdentityName(decodeURIComponent(cookie.value))
      if (name) names.push(name)
    } catch {
      const name = normalizePlanIdentityName(cookie.value)
      if (name) names.push(name)
    }
  }
  return names
}

export function getAllPlanIdentityNamesFromRequest(req: NextRequest): string[] {
  return getAllPlanIdentityNamesFromCookies(req.cookies)
}

export function appendPlanIdentityCookie(
  res: NextResponse,
  pollId: string,
  respondentName: string,
): void {
  const name = normalizePlanIdentityName(respondentName)
  if (!name) return

  res.cookies.set({
    name: planIdentityCookieName(pollId),
    value: encodeURIComponent(name),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PLAN_IDENTITY_MAX_AGE,
  })
}
