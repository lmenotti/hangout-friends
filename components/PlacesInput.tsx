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

  // Fallback state: if Maps JS fails to init, use server-side suggestions
  const [useFallback, setUseFallback] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sync controlled value → DOM when parent changes it (e.g. form reset)
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value
    }
  }, [value])

  useEffect(() => {
    const init = () => {
      if (!inputRef.current || !window.google?.maps?.places || autocompleteRef.current) return
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name', 'geometry'],
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
      } else if (elapsed >= 4000) {
        // Maps JS didn't load in time — fall back to server-side autocomplete
        clearInterval(interval)
        setUseFallback(true)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  // Fallback: server-side autocomplete fetch
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
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [value, useFallback])

  const selectFallback = (s: string) => {
    onChange(s)
    if (inputRef.current) inputRef.current.value = s
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
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
                className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-2 text-zinc-200 hover:bg-zinc-700/70 transition-colors"
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
