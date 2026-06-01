/** Client-safe date label for scheduled plans (no server-only imports). */
export function formatScheduledLabel(scheduledAt: Date): string {
  return scheduledAt.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
