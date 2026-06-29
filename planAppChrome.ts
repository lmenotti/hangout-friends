let showAppChrome = false
const listeners = new Set<() => void>()

export function getPlanAppChrome(): boolean {
  return showAppChrome
}

export function setPlanAppChrome(value: boolean): void {
  if (showAppChrome === value) return
  showAppChrome = value
  listeners.forEach(listener => listener())
}

export function subscribePlanAppChrome(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
