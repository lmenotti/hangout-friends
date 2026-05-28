'use client'

import { usePathname } from 'next/navigation'
import { isPlanRespondPage } from '@/lib/planRoutes'

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const respondPage = isPlanRespondPage(pathname)

  return (
    <main
      className="max-w-4xl mx-auto px-4 py-8 md:pb-8"
      style={
        respondPage
          ? { paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }
          : { paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }
      }
    >
      {children}
    </main>
  )
}
