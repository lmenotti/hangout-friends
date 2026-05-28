import { Metadata } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import JoinFormClient from './JoinFormClient'

const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hangout-friends.vercel.app'

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ code?: string }> }
): Promise<Metadata> {
  const { code } = await searchParams

  if (!code) {
    return { title: 'Join a pod — hangout-friends' }
  }

  const { data: pod } = await supabase
    .from('pods')
    .select('name, id')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!pod) {
    return { title: 'Join a pod — hangout-friends' }
  }

  const { count } = await supabase
    .from('pod_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('pod_id', pod.id)

  const title = `Join ${pod.name} on hangout-friends`
  const description = `You've been invited to join ${pod.name} — ${count ?? 0} member${count !== 1 ? 's' : ''} already inside.`
  const ogImage = `${appUrl}/api/og?title=${encodeURIComponent(title)}&sub=${encodeURIComponent(`${count ?? 0} member${count !== 1 ? 's' : ''} · Invite code: ${code}`)}&cta=Join+pod`

  return {
    title,
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

export default function JoinPodPage() {
  return <JoinFormClient />
}
