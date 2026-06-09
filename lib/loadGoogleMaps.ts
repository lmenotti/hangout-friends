/** Load Google Maps Places JS once; key stays server-side via /api/places/maps-script. */
let loadPromise: Promise<boolean> | null = null

export function loadGoogleMaps(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.google?.maps?.places) return Promise.resolve(true)
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const res = await fetch('/api/places/maps-script')
      if (!res.ok) return false

      const { src } = (await res.json()) as { src?: string }
      if (!src) return false

      const existing = document.getElementById('google-maps') as HTMLScriptElement | null
      if (existing) {
        if (window.google?.maps?.places) return true
        await new Promise<void>((resolve, reject) => {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => reject(), { once: true })
        }).catch(() => {})
        return Boolean(window.google?.maps?.places)
      }

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.id = 'google-maps'
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('maps script failed'))
        document.head.appendChild(script)
      })

      return Boolean(window.google?.maps?.places)
    } catch {
      return false
    }
  })()

  return loadPromise
}

/** Mobile/coarse-pointer devices use server autocomplete instead of ~200KB Maps JS. */
export function prefersPlacesServerFallback(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: unknown
      }
    }
  }
}
