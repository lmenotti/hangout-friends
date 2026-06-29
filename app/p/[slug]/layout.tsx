import { cookies } from 'next/headers'
import { isCreatorByCookie } from '@/lib/planCreator'
import { getPollBySlug } from '@/lib/planPageData'
import PlanAppChromeSync from '@/components/PlanAppChromeSync'
import PlanCreatorBar from '@/components/PlanCreatorBar'

export default async function PlanSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const poll = await getPollBySlug(slug)
  const cookieStore = await cookies()
  const isCreator = poll
    ? isCreatorByCookie(cookieStore, poll.id, poll.creator_token)
    : false

  return (
    <>
      <PlanAppChromeSync show={isCreator} />
      {isCreator && <PlanCreatorBar />}
      <div
        className={isCreator ? 'md:pt-0 pt-[calc(3.5rem+env(safe-area-inset-top))]' : undefined}
      >
        {children}
      </div>
    </>
  )
}
