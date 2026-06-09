import webpush from 'web-push'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { formatScheduledLabel } from '@/lib/formatScheduledLabel'
import type { PlanWatchEntry, PushSubscription } from '@/types/database'

/**
 * VAPID keys (Web Push):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY — server; set in Vercel env.
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY — same public key for browser subscribe.
 *
 * Generate once:
 *   npx web-push generate-vapid-keys
 */

export const PUSH_NOTIFICATION_TYPES = [
  'plan_response',
  'plan_scheduled',
  'event_reminder',
] as const

export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[number]

const ALLOWED = new Set<string>(PUSH_NOTIFICATION_TYPES)

export type PlanWatch = PlanWatchEntry

type PushMessage = {
  title: string
  body: string
  url: string
  type: PushNotificationType
}

export type PushPayloadMap = {
  plan_response: {
    pollId: string
    slug: string
    title: string
    responderName: string
  }
  plan_scheduled: {
    pollId: string
    slug: string
    title: string
    scheduledAt: string
  }
  event_reminder: {
    pollId: string
    slug: string
    title: string
    scheduledAt: string
  }
}

type PushSubscriptionRow = Pick<PushSubscription, 'id' | 'endpoint' | 'p256dh' | 'auth'>

function planUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'
  return `${base}/p/${slug}`
}

function assertAllowedType(type: string): asserts type is PushNotificationType {
  if (!ALLOWED.has(type)) {
    throw new Error(`Push notification type not allowed: ${type}`)
  }
}

function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:hello@hangout-friends.vercel.app'
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

function buildMessage(type: PushNotificationType, payload: PushPayloadMap[typeof type]): PushMessage {
  switch (type) {
    case 'plan_response': {
      const p = payload as PushPayloadMap['plan_response']
      return {
        type,
        title: p.title,
        body: `${p.responderName} responded to your plan`,
        url: planUrl(p.slug),
      }
    }
    case 'plan_scheduled': {
      const p = payload as PushPayloadMap['plan_scheduled']
      return {
        type,
        title: p.title,
        body: `Scheduled for ${formatScheduledLabel(new Date(p.scheduledAt))}`,
        url: planUrl(p.slug),
      }
    }
    case 'event_reminder': {
      const p = payload as PushPayloadMap['event_reminder']
      return {
        type,
        title: p.title,
        body: `Happening tomorrow — ${formatScheduledLabel(new Date(p.scheduledAt))}`,
        url: planUrl(p.slug),
      }
    }
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled push type: ${_exhaustive}`)
    }
  }
}

async function fetchSubscriptionsForPoll(
  pollId: string,
  filter: (watch: PlanWatch) => boolean,
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, plan_watches')

  if (error || !data?.length) return []

  const rows: PushSubscriptionRow[] = []
  for (const row of data) {
    const watches = (row.plan_watches ?? []) as PlanWatch[]
    if (watches.some(w => w.poll_id === pollId && filter(w))) {
      rows.push({
        id: row.id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      })
    }
  }
  return rows
}

async function deliverToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  message: PushMessage,
): Promise<void> {
  if (!subscriptions.length) return
  if (!configureVapid()) return

  const payload = JSON.stringify(message)

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }),
  )
}

/** Allowlisted dispatcher — only the three PRODUCT.md notification types. */
export async function sendPush<T extends PushNotificationType>(
  type: T,
  payload: PushPayloadMap[T],
  subscriptionIds: PushSubscriptionRow[],
): Promise<void> {
  assertAllowedType(type)
  const message = buildMessage(type, payload)
  await deliverToSubscriptions(subscriptionIds, message)
}

export async function notifyPlanCreatorOfResponse(
  pollId: string,
  responderName: string,
): Promise<void> {
  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, slug, creator_name')
    .eq('id', pollId)
    .single()

  if (!poll?.slug) return

  const creatorFirst = poll.creator_name.trim().split(/\s+/)[0] ?? ''
  const responderFirst = responderName.trim().split(/\s+/)[0] ?? ''
  if (
    creatorFirst &&
    responderFirst &&
    creatorFirst.toLowerCase() === responderFirst.toLowerCase()
  ) {
    return
  }

  const subs = await fetchSubscriptionsForPoll(pollId, w => w.role === 'creator')
  await sendPush('plan_response', {
    pollId,
    slug: poll.slug,
    title: poll.title,
    responderName: responderFirst || responderName,
  }, subs)
}

export async function notifyPlanCreatorScheduled(pollId: string): Promise<void> {
  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, slug, scheduled_at')
    .eq('id', pollId)
    .single()

  if (!poll?.slug || !poll.scheduled_at) return

  const subs = await fetchSubscriptionsForPoll(pollId, w => w.role === 'creator')
  await sendPush(
    'plan_scheduled',
    {
      pollId,
      slug: poll.slug,
      title: poll.title,
      scheduledAt: poll.scheduled_at,
    },
    subs,
  )
}

/** UTC calendar day after today (tomorrow). */
function utcTomorrowBounds(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2))
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function sendEventRemindersForTomorrow(): Promise<{ sent: number }> {
  const { start, end } = utcTomorrowBounds()

  const { data: polls } = await supabase
    .from('polls')
    .select('id, title, slug, scheduled_at')
    .eq('status', 'scheduled')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .is('archived_at', null)

  if (!polls?.length) return { sent: 0 }

  let sent = 0

  for (const poll of polls) {
    if (!poll.slug || !poll.scheduled_at) continue

    const { data: yesRsvps } = await supabase
      .from('poll_rsvps')
      .select('respondent_name')
      .eq('poll_id', poll.id)
      .eq('status', 'yes')

    if (!yesRsvps?.length) continue

    const yesNames = new Set(
      yesRsvps.map(r => (r.respondent_name.trim().split(/\s+/)[0] ?? r.respondent_name).toLowerCase()),
    )

    const subs = await fetchSubscriptionsForPoll(poll.id, w => {
      if (w.role !== 'rsvp') return false
      const name = (w.respondent_name ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
      return name !== '' && yesNames.has(name)
    })

    if (subs.length) {
      await sendPush(
        'event_reminder',
        {
          pollId: poll.id,
          slug: poll.slug,
          title: poll.title,
          scheduledAt: poll.scheduled_at,
        },
        subs,
      )
      sent += subs.length
    }
  }

  return { sent }
}
