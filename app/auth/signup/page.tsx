import { redirect } from 'next/navigation'

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string }>
}

/** Legacy route — unified auth lives at /auth/signin. */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams
  const query = params.returnTo ? `?returnTo=${encodeURIComponent(params.returnTo)}` : ''
  redirect(`/auth/signin${query}`)
}
