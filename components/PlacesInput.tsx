'use client'

import { useEffect, useRef } from 'react'

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

  // Sync controlled value → DOM when parent changes it (e.g. form reset)
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value
    }
  }, [value])

  useEffect(() => {
    const init = () => {
      if (!inputRef.current || !window.google?.maps?.places || autocompleteRef.current) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'name', 'geometry'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        const address = place?.formatted_address || place?.name || ''
        if (address) onChangeRef.current(address)
      })
    }

    if (window.google?.maps?.places) {
      init()
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval)
          init()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
