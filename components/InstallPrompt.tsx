'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isPlanRespondPage } from '@/lib/planRoutes'

const VISITS_KEY = 'hangout_plan_visits'
const DISMISS_KEY = 'hangout_install_prompt_dismissed'

function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}

function getPlanVisitKey(pathname: string): string | null {
  if (pathname.startsWith('/p/')) {
    const slug = pathname.slice(3).split('/')[0]
    return slug ? `p:${slug}` : null
  }
  if (pathname.startsWith('/polls/') && pathname !== '/polls/new') {
    const id = pathname.slice(7).split('/')[0]
    return id ? `poll:${id}` : null
  }
  return null
}

function readVisits(): string[] {
  try {
    const raw = localStorage.getItem(VISITS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function recordPlanVisit(key: string): string[] {
  const visits = readVisits()
  if (visits.includes(key)) return visits
  const next = [...visits, key]
  try {
    localStorage.setItem(VISITS_KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  return next
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  const refresh = useCallback(() => {
    if (isInstalledPwa()) {
      setVisible(false)
      return
    }
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setVisible(false)
        return
      }
    } catch {
      setVisible(false)
      return
    }
    if (isPlanRespondPage(pathname)) {
      setVisible(false)
      return
    }
    setVisible(readVisits().length >= 2)
  }, [pathname])

  useEffect(() => {
    const key = getPlanVisitKey(pathname)
    if (key) recordPlanVisit(key)
    refresh()
  }, [pathname, refresh])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 z-50 px-4 pointer-events-none bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-4"
      role="region"
      aria-label="Install Hangout"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto rounded-xl border border-indigo-500/30 bg-zinc-900/95 backdrop-blur-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100">Add Hangout to your Home Screen</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tap Share, then &ldquo;Add to Home Screen&rdquo; for quick access to your plans.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-zinc-500 hover:text-zinc-300 p-2 -m-2 rounded-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss install suggestion"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
