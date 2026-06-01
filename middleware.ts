import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LAST_PLAN_SLUG_COOKIE } from '@/lib/lastPlan'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const match = req.nextUrl.pathname.match(/^\/p\/([^/]+)/)
  const slug = match?.[1]
  if (slug) {
    res.cookies.set({
      name: LAST_PLAN_SLUG_COOKIE,
      value: slug,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return res
}

export const config = {
  matcher: ['/p/:slug*'],
}
