/** Max length for `users.name` (matches legacy signup validation). */
export const DISPLAY_NAME_MAX_LENGTH = 40

/** Tracks how the account display name was chosen — drives Google upgrade eligibility. */
export type DisplayNameSource =
  | 'plan_identity'
  | 'derived'
  | 'email_local'
  | 'google'

export type ResolvedDisplayName = {
  name: string
  source: DisplayNameSource
}

/** True only when the name came from email local-part parsing (step 2), not plan identity or fallback. */
export function canUpgradeNameFromGoogle(source: DisplayNameSource | string | null | undefined): boolean {
  return source === 'derived'
}

/**
 * Resolve display name for a new account (priority order):
 * 1. Plan identity cookie name(s) on this device
 * 2. First segment of email local part (split on `.`, `_`, `-`), lowercase
 * 3. (fallback) Full email local part, lowercase
 */
export function resolveDisplayNameForNewAccount(
  email: string,
  planIdentityNames: string[],
): ResolvedDisplayName {
  const fromPlan = pickPlanIdentityName(planIdentityNames)
  if (fromPlan) {
    return { name: fromPlan, source: 'plan_identity' }
  }

  const derived = deriveFirstNameFromEmailLocalPart(email)
  if (derived) {
    return { name: derived, source: 'derived' }
  }

  return { name: emailLocalPartDisplayName(email), source: 'email_local' }
}

/** First plan-identity name found on device (preserves user-entered casing). */
function pickPlanIdentityName(names: string[]): string | null {
  const seen = new Set<string>()
  for (const raw of names) {
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    return raw.slice(0, DISPLAY_NAME_MAX_LENGTH)
  }
  return null
}

/**
 * Parse first segment of email local part as a first name.
 * e.g. john.smith@berkeley.edu → "john"
 */
export function deriveFirstNameFromEmailLocalPart(email: string): string | null {
  const local = email.split('@')[0]?.toLowerCase().trim() ?? ''
  if (!local) return null

  const segment = local.split(/[._-]/)[0] ?? ''
  if (segment.length < 2) return null
  if (!/^[a-z]/.test(segment)) return null
  if (/^\d+$/.test(segment)) return null

  return segment.slice(0, DISPLAY_NAME_MAX_LENGTH)
}

/** Fallback display name: full email local part, lowercase. */
export function emailLocalPartDisplayName(email: string): string {
  const local = email.split('@')[0]?.toLowerCase().trim() ?? ''
  if (!local) return 'user'
  return local.slice(0, DISPLAY_NAME_MAX_LENGTH)
}

/** Normalize Google profile given name for storage (first token, lowercase). */
export function normalizeGoogleGivenName(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const first = raw.trim().split(/\s+/)[0] ?? ''
  if (!first) return null
  return first.toLowerCase().slice(0, DISPLAY_NAME_MAX_LENGTH)
}
