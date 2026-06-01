import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const WEAK_PINS = new Set(['1234', '0000', 'admin'])

function isWeakPin(pin: string): boolean {
  return WEAK_PINS.has(pin.trim().toLowerCase())
}

/** Trimmed ADMIN_PIN from env, or null if missing, empty, or a known weak default. */
export function getAdminPin(): string | null {
  const raw = process.env.ADMIN_PIN
  if (raw == null) return null
  const pin = raw.trim()
  if (!pin || isWeakPin(pin)) return null
  return pin
}

export function isAdminPinConfigured(): boolean {
  return getAdminPin() !== null
}

export function checkAdminPin(req: NextRequest): boolean {
  const expected = getAdminPin()
  if (!expected) return false

  const provided = (req.headers.get('x-admin-pin') ?? '').trim()
  if (!provided || isWeakPin(provided)) return false

  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  if (expectedBuf.length !== providedBuf.length) {
    crypto.timingSafeEqual(expectedBuf, expectedBuf)
    return false
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}
