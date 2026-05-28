import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { formatScheduledLabel } from '@/lib/pollSchedule'
import PollPageClient from './PollPageClient'

const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'

type PollMetaRow = {
  id: string
  title: string
  creator_name: string
  slug: string
  status: 'polling' | 'scheduled'
  scheduled_at: string | null
  scheduled_end_at: string | null
}

type RsvpCounts = { yes: number; maybe: number; no: number }

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
): Metadata {
  const title = poll.title
  const firstName = creatorFirstName(poll.creator_name)
  const isScheduled = poll.status === 'scheduled' && poll.scheduled_at
  const planUrl = poll.slug ? `${appUrl}/p/${poll.slug}` : `${appUrl}/polls/${poll.id}`

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
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params

  const { data: poll } = await supabase
    .from('polls')
    .select('id, title, creator_name, slug, status, scheduled_at, scheduled_end_at')
    .eq('id', id)
    .single()

  if (!poll) {
    return { title: 'Poll — hangout-friends' }
  }

  const [{ count }, { data: rsvps }] = await Promise.all([
    supabase
      .from('poll_responses')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', id),
    supabase
      .from('poll_rsvps')
      .select('status')
      .eq('poll_id', id),
  ])

  return buildPlanMetadata(poll as PollMetaRow, count ?? 0, countRsvps(rsvps))
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: poll } = await supabase
    .from('polls')
    .select('slug')
    .eq('id', id)
    .single()

  if (poll?.slug) redirect(`/p/${poll.slug}`)

  return <PollPageClient id={id} />
}
