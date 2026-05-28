import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import PollPageClient from '@/app/polls/[id]/PollPageClient'

const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'

async function getPollBySlug(slug: string) {
  const { data } = await supabase
    .from('polls')
    .select('id, title, creator_name')
    .eq('slug', slug)
    .single()
  return data
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const poll = await getPollBySlug(slug)

  if (!poll) return { title: 'Plan — hangout-friends' }

  const { count } = await supabase
    .from('poll_responses')
    .select('id', { count: 'exact', head: true })
    .eq('poll_id', poll.id)

  const title = poll.title
  const sub = `${count ?? 0} response${count !== 1 ? 's' : ''} · Created by ${poll.creator_name}`
  const description = `${poll.creator_name} wants to find a time. Add your availability — no account needed.`
  const ogImage = `${appUrl}/api/og?title=${encodeURIComponent(title)}&sub=${encodeURIComponent(sub)}&cta=Mark+availability`

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

export default async function PlanSlugPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const poll = await getPollBySlug(slug)

  if (!poll) notFound()

  return <PollPageClient id={poll.id} />
}
