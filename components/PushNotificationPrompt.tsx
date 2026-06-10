'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isPlanRespondPage } from '@/lib/planRoutes'
import {
  fetchPlanWatches,
  pushSupported,
  requestPushPermissionAndSync,
  syncPushSubscription,
} from '@/lib/pushSubscribeClient'

const DISMISS_KEY = 'hangout_push_prompt_dismissed'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export default function PushNotificationPrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (pathname === '/polls/new') {
      setVisible(false)
      return
    }
    if (!VAPID_PUBLIC_KEY || !pushSupported()) {
      setVisible(false)
      return
    }
    if (isPlanRespondPage(pathname)) {
      setVisible(false)
      return
    }
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10)
        if (elapsed < 7 * 24 * 60 * 60 * 1000) {
          setVisible(false)
          return
        }
        localStorage.removeItem(DISMISS_KEY) // cooldown expired — allow re-prompt
      }
    } catch {
      setVisible(false)
      return
    }

    const permission = Notification.permission

    if (permission === 'granted') {
      setVisible(false)
      void syncPushSubscription(VAPID_PUBLIC_KEY).catch(() => {})
      return
    }

    if (permission === 'denied') {
      setVisible(false)
      return
    }

    const watches = await fetchPlanWatches()
    setVisible(watches.length > 0)
  }, [pathname])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  const enable = async () => {
    setBusy(true)
    try {
      const permission = await requestPushPermissionAndSync(VAPID_PUBLIC_KEY)
      if (permission === 'granted') {
        setVisible(false)
      } else if (permission === 'denied') {
        dismiss()
      }
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 z-50 px-4 pointer-events-none top-[calc(3.5rem+env(safe-area-inset-top))] md:top-4"
      role="region"
      aria-label="Enable notifications"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto rounded-xl border border-teal-500/30 bg-zinc-900/95 backdrop-blur-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100">Get plan updates</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Notify you when someone responds, when a plan is scheduled, or before an event.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white touch-manipulation min-h-[44px]"
          >
            {busy ? '…' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-zinc-500 hover:text-zinc-300 p-2 rounded-lg touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss notification suggestion"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
