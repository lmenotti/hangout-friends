import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const CREATOR_COOKIE_PREFIX = 'hangout_creator_'
const CREATOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function generateCreatorToken(): string {
  return randomUUID()
}

export function planCreatorCookieName(pollId: string): string {
  return `${CREATOR_COOKIE_PREFIX}${pollId}`
}

type CookieReader = {
  get: (name: string) => { value: string } | undefined
}

export function getCreatorTokenFromCookies(cookieStore: CookieReader, pollId: string): string | null {
  return cookieStore.get(planCreatorCookieName(pollId))?.value ?? null
}

export function getCreatorTokenFromRequest(req: NextRequest, pollId: string): string | null {
  return req.cookies.get(planCreatorCookieName(pollId))?.value ?? null
}

// Returns true if the request/cookie belongs to the plan creator.
// storedToken null means the plan predates the ownership system — allow anyone (backward compat).
export function isCreatorByCookie(cookieStore: CookieReader, pollId: string, storedToken: string | null): boolean {
  if (!storedToken) return true
  const token = getCreatorTokenFromCookies(cookieStore, pollId)
  return !!token && token === storedToken
}

export function isCreatorByRequest(req: NextRequest, pollId: string, storedToken: string | null): boolean {
  if (!storedToken) return true
  const token = getCreatorTokenFromRequest(req, pollId)
  return !!token && token === storedToken
}

export function appendCreatorCookie(res: NextResponse, pollId: string, token: string): void {
  res.cookies.set({
    name: planCreatorCookieName(pollId),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CREATOR_COOKIE_MAX_AGE,
  })
}
