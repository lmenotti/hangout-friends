import { Metadata } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import PollPageClient from './PollPageClient'

const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params

  const { data: poll } = await supabase
    .from('polls')
    .select('title, creator_name')
    .eq('id', id)
    .single()

  const { count } = await supabase
    .from('poll_responses')
    .select('id', { count: 'exact', head: true })
    .eq('poll_id', id)

  if (!poll) {
    return { title: 'Poll — hangout-friends' }
  }

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

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PollPageClient id={id} />
}
