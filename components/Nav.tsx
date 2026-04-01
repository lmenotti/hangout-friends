'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'

const links = [
  { href: '/availability', label: 'Availability' },
  { href: '/ideas', label: 'Ideas' },
  { href: '/events', label: 'Events' },
  { href: '/bugs', label: 'Report' },
]

export default function Nav() {
  const pathname = usePathname()
  const { user, clearUser } = useUser()

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
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-zinc-400 hidden sm:block truncate max-w-[120px]">
              <span className="text-zinc-200">{user.name}</span>
            </span>
            <button
              onClick={clearUser}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-2 rounded-lg hover:bg-zinc-800 touch-manipulation min-h-[44px]"
            >
              Switch
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
