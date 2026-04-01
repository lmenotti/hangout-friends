'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

declare global {
  interface Window { google: any }
}

export default function PlacesInput({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Fallback to server-side suggestions if Maps JS doesn't load
  const [useFallback, setUseFallback] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync controlled value → DOM when parent updates it (e.g. form reset)
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value
    }
  }, [value])

  // Initialize Google Places Autocomplete (or fall back after timeout)
  useEffect(() => {
    const init = () => {
      if (!inputRef.current || !window.google?.maps?.places || autocompleteRef.current) return
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name'],
        })
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          const address = place?.formatted_address || place?.name || ''
          if (address) onChangeRef.current(address)
        })
      } catch {
        setUseFallback(true)
      }
    }

    if (window.google?.maps?.places) {
      init()
      return
    }

    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 200
      if (window.google?.maps?.places) {
        clearInterval(interval)
        init()
      } else if (elapsed >= 5000) {
        clearInterval(interval)
        setUseFallback(true)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  // Server-side fallback: fetch suggestions from our API route
  useEffect(() => {
    if (!useFallback) return
    clearTimeout(debounceRef.current)
    if (!value.trim() || value.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(value)}`)
        if (!res.ok) return
        const data = await res.json()
        const list = data.suggestions ?? []
        setSuggestions(list)
        setOpen(list.length > 0)
        setActiveIndex(-1)
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [value, useFallback])

  // Close fallback dropdown on outside click
  useEffect(() => {
    if (!useFallback) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [useFallback])

  const selectFallback = (s: string) => {
    onChange(s)
    if (inputRef.current) inputRef.current.value = s
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !useFallback) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectFallback(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => useFallback && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {useFallback && open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectFallback(s)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 transition-colors ${
                  i === activeIndex ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-200 hover:bg-zinc-700/70'
                }`}
              >
                <span className="text-zinc-500 shrink-0 mt-px">📍</span>
                <span className="flex-1 min-w-0">{s}</span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-zinc-600 border-t border-zinc-700/50">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  )
}
