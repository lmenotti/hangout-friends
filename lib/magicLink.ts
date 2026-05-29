const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed || !EMAIL_RE.test(trimmed)) return null
  return trimmed
}

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/profile'
  if (raw.startsWith('/auth/')) return '/profile'
  return raw
}

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000
