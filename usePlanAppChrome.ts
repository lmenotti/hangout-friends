'use client'

import { useSyncExternalStore } from 'react'
import { getPlanAppChrome, subscribePlanAppChrome } from '@/lib/planAppChrome'

export function usePlanAppChrome(): boolean {
  return useSyncExternalStore(subscribePlanAppChrome, getPlanAppChrome, () => false)
}
