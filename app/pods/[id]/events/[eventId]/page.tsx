import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import EventPageClient from './EventPageClient'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hangout-friends.vercel.app'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string; eventId: string }> }
): Promise<Metadata> {
  const { id: podId, eventId } = await params

  const [{ data: event }, { data: pod }] = await Promise.all([
    supabase.from('events').select('title, scheduled_at, location').eq('id', eventId).single(),
    supabase.from('pods').select('name').eq('id', podId).single(),
  ])

  if (!event || !pod) {
    return { title: 'Event — hangout-friends' }
  }

  const dateStr = new Date(event.scheduled_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  const title = event.title
  const sub = `${dateStr}${event.location ? ` · ${event.location}` : ''} · ${pod.name}`
  const description = `${event.title} — ${dateStr}. RSVP on hangout-friends.`
  const ogImage = `${appUrl}/api/og?title=${encodeURIComponent(title)}&sub=${encodeURIComponent(sub)}&cta=RSVP`

  return {
    title: `${title} — hangout-friends`,
    description,
    openGraph: {
      title,
      description,
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

export default async function EventPage(
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: podId, eventId } = await params
  return <EventPageClient podId={podId} eventId={eventId} />
}
