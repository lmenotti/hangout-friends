'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'

const links = [
  { href: '/availability', label: 'Availability' },
  { href: '/ideas', label: 'Ideas' },
  { href: '/events', label: 'Events' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/bugs', label: 'Report' },
]

export default function Nav() {
  const pathname = usePathname()
  const { user, guestMode, showSignIn } = useUser()

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/" className="font-semibold text-white text-sm tracking-tight shrink-0 touch-manipulation">
            hangout
          </Link>
          {/* Desktop nav links — hidden on mobile (bottom nav takes over) */}
          <div className="hidden md:flex gap-0.5">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap touch-manipulation transition-colors min-h-[36px] flex items-center ${
                  pathname === link.href
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:bg-zinc-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        {!user && guestMode && (
          <button
            onClick={showSignIn}
            className="text-sm px-3 py-2 rounded-lg transition-colors touch-manipulation min-h-[44px] flex items-center gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span className="hidden sm:block">Sign in</span>
          </button>
        )}
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/profile"
              className={`text-sm px-3 py-2 rounded-lg transition-colors touch-manipulation min-h-[44px] flex items-center gap-2 ${
                pathname === '/profile'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span className="hidden sm:block">{user.name}</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
