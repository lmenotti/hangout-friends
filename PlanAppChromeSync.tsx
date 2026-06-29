'use client'

import { useLayoutEffect } from 'react'
import { setPlanAppChrome } from '@/lib/planAppChrome'

export default function PlanAppChromeSync({ show }: { show: boolean }) {
  useLayoutEffect(() => {
    setPlanAppChrome(show)
    return () => setPlanAppChrome(false)
  }, [show])

  return null
}
