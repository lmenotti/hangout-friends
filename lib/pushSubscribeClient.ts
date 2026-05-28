import type { PlanWatch } from '@/lib/pushNotifications'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

function deviceId(): string | null {
  try {
    const k = 'hangout_device_id'
    let id = localStorage.getItem(k)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(k, id)
    }
    return id
  } catch {
    return null
  }
}

function getToken(): string | null {
  try {
    const m = document.cookie.match(/(?:^|; )gs_token=([^;]*)/)
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function fetchPlanWatches(): Promise<PlanWatch[]> {
  const res = await fetch('/api/push/watches', { credentials: 'include' })
  if (!res.ok) return []
  const data = (await res.json()) as { watches?: PlanWatch[] }
  return data.watches ?? []
}

async function subscribePush(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (Notification.permission !== 'granted') return null

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })
  }
  return sub
}

async function postSubscription(sub: PushSubscription, watches: PlanWatch[]): Promise<boolean> {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['x-user-token'] = token

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      device_id: deviceId(),
      plan_watches: watches,
    }),
  })
  return res.ok
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return Promise.resolve(null)
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .then(reg => reg)
      .catch(() => null)
  }
  return registrationPromise
}

/** Register SW and sync push subscription when permission is already granted. */
export async function syncPushSubscription(vapidPublicKey: string): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false

  const watches = await fetchPlanWatches()
  if (!watches.length) return false

  const reg = await getServiceWorkerRegistration()
  if (!reg) return false

  const sub = await subscribePush(reg, vapidPublicKey)
  if (!sub) return false

  return postSubscription(sub, watches)
}

/** Request notification permission, then subscribe. Returns final permission state. */
export async function requestPushPermissionAndSync(vapidPublicKey: string): Promise<NotificationPermission> {
  if (!pushSupported()) return 'denied'

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  if (permission === 'granted') {
    await syncPushSubscription(vapidPublicKey)
  }

  return permission
}
