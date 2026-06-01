import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPin, isAdminPinConfigured } from '@/lib/adminPin'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10

type FailureBucket = { count: number; resetAt: number }

const failuresByKey = new Map<string, FailureBucket>()

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of failuresByKey) {
    if (bucket.resetAt <= now) failuresByKey.delete(key)
  }
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  pruneExpired(now)
  const bucket = failuresByKey.get(key)
  return !!bucket && bucket.count >= MAX_FAILURES && bucket.resetAt > now
}

function recordFailure(key: string): void {
  const now = Date.now()
  pruneExpired(now)
  const existing = failuresByKey.get(key)
  if (!existing || existing.resetAt <= now) {
    failuresByKey.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  existing.count += 1
}

/** Returns an error response when auth fails; null when the request may proceed. */
export function requireAdminPin(req: NextRequest): NextResponse | null {
  if (!isAdminPinConfigured()) {
    return NextResponse.json(
      { error: 'Admin PIN is not configured on this deployment.' },
      { status: 503 },
    )
  }

  const key = clientKey(req)
  if (isRateLimited(key)) {
    return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 })
  }

  if (!checkAdminPin(req)) {
    recordFailure(key)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
