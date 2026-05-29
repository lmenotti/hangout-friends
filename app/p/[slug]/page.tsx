import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { formatScheduledLabel } from '@/lib/pollSchedule'
import PollPageClient from '@/app/polls/[id]/PollPageClient'

const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'

type PollMetaRow = {
  id: string
  title: string
  creator_name: string
  status: 'polling' | 'scheduled'
  scheduled_at: string | null
  scheduled_end_at: string | null
  expires_at: string | null
  archived_at: string | null
}

function isPlanExpired(poll: Pick<PollMetaRow, 'archived_at' | 'expires_at'>): boolean {
  if (poll.archived_at) return true
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) return true
  return false
}

type RsvpCounts = { yes: number; maybe: number; no: number }

async function getPollBySlug(slug: string) {
  const { data } = await supabase
    .from('polls')
    .select('id, title, creator_name, status, scheduled_at, scheduled_end_at, expires_at, archived_at')
    .eq('slug', slug)
    .single()
  return data as PollMetaRow | null
}

function PlanExpired({ title }: { title: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
      <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
      <p className="text-sm text-zinc-500">This plan has expired and is no longer available.</p>
      <p className="text-xs text-zinc-600">Plans are kept for 30 days after the event date.</p>
    </div>
  )
}

function creatorFirstName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return name
  return trimmed.split(/\s+/)[0] ?? trimmed
}

function countRsvps(rsvps: { status: string }[] | null): RsvpCounts {
  return {
    yes: rsvps?.filter(r => r.status === 'yes').length ?? 0,
    maybe: rsvps?.filter(r => r.status === 'maybe').length ?? 0,
    no: rsvps?.filter(r => r.status === 'no').length ?? 0,
  }
}

function truncateForOg(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function buildOgImageUrl(title: string, sub: string, cta: string): string {
  const params = new URLSearchParams({
    title: truncateForOg(title, 55),
    sub: truncateForOg(sub, 90),
    cta,
  })
  return `${appUrl}/api/og?${params.toString()}`
}

function buildPlanMetadata(
  poll: PollMetaRow,
  responseCount: number,
  rsvpCounts: RsvpCounts,
  planUrl: string,
): Metadata {
  const title = poll.title
  const firstName = creatorFirstName(poll.creator_name)
  const isScheduled = poll.status === 'scheduled' && poll.scheduled_at

  let sub: string
  let description: string
  let cta: string

  if (isScheduled) {
    const scheduledLabel = formatScheduledLabel(new Date(poll.scheduled_at!))
    sub = `${scheduledLabel} · ${rsvpCounts.yes} yes, ${rsvpCounts.maybe} maybe · by ${firstName}`
    description = `${title} — ${scheduledLabel}. RSVP on hangout-friends.`
    cta = 'RSVP'
  } else {
    sub = `${responseCount} response${responseCount !== 1 ? 's' : ''} · Created by ${poll.creator_name}`
    description = `${firstName} wants to find a time. Add your availability — no account needed.`
    cta = 'Mark availability'
  }

  const ogImage = buildOgImageUrl(title, sub, cta)

  return {
    title: `${title} — hangout-friends`,
    description,
    openGraph: {
      title,
      description,
      url: planUrl,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const poll = await getPollBySlug(slug)

  if (!poll) return { title: 'Plan — hangout-friends' }

  if (isPlanExpired(poll)) {
    return {
      title: `${poll.title} — expired`,
      description: 'This plan has expired and is no longer available.',
    }
  }

  const [{ count }, { data: rsvps }] = await Promise.all([
    supabase
      .from('poll_responses')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', poll.id),
    supabase
      .from('poll_rsvps')
      .select('status')
      .eq('poll_id', poll.id),
  ])

  return buildPlanMetadata(
    poll,
    count ?? 0,
    countRsvps(rsvps),
    `${appUrl}/p/${slug}`,
  )
}

export default async function PlanSlugPage(
  {
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ fill?: string }>
  },
) {
  const { slug } = await params
  const { fill } = await searchParams
  const poll = await getPollBySlug(slug)

  if (!poll) notFound()

  if (isPlanExpired(poll)) {
    return <PlanExpired title={poll.title} />
  }

  return <PollPageClient id={poll.id} autoFillAvailability={fill === '1'} />
}
