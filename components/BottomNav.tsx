'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { isPlanRespondPage } from '@/lib/planRoutes'

const mainTabs = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 12L12 3l9 9" />
        <path d="M9 21V12h6v9" />
        <path d="M5 10v11h14V10" />
      </svg>
    ),
  },
  {
    href: '/polls/new',
    label: 'New Plan',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    href: '/pods',
    label: 'Pods',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        <path d="M17 14c2.2.4 4 2 4 4" />
      </svg>
    ),
  },
]

const profileTab = {
  href: '/profile',
  label: 'Profile',
  icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
}

const signInTab = {
  href: '/auth/signin',
  label: 'Sign in',
  icon: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
}

export default function BottomNav() {
  const pathname = usePathname()
  const { user, loading } = useUser()

  if (pathname === '/admin' || isPlanRespondPage(pathname)) return null

  // While auth is resolving keep showing Profile to avoid a tab label flash.
  const lastTab = loading || user ? profileTab : signInTab
  const tabs = [...mainTabs, lastTab]

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(tab => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors touch-manipulation min-h-[56px] ${
                active ? 'text-indigo-400' : 'text-zinc-600 active:text-zinc-400'
              }`}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-indigo-400' : 'text-zinc-600'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
