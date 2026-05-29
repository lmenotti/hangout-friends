/** Canonical app origin for share links, OAuth, and magic links. */
export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}
