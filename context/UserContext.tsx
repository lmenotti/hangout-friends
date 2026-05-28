'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { UserPublic } from '@/types/database'

const COOKIE_NAME = 'gs_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

type UserContextType = {
  user: UserPublic | null
  token: string | null
  loading: boolean
  signInOpen: boolean
  setUser: (user: UserPublic, token: string) => void
  updateUser: (user: UserPublic) => void
  clearUser: () => void
  showSignIn: () => void
  hideSignIn: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  token: null,
  loading: true,
  signInOpen: false,
  setUser: () => {},
  updateUser: () => {},
  clearUser: () => {},
  showSignIn: () => {},
  hideSignIn: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserPublic | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => {
    // One-time migration: move token from localStorage to cookie
    const lsToken = localStorage.getItem('gs_token')
    if (lsToken) {
      setCookie(COOKIE_NAME, lsToken)
      localStorage.removeItem('gs_token')
    }

    const storedToken = getCookie(COOKIE_NAME)
    if (!storedToken) {
      setLoading(false)
      return
    }
    fetch('/api/users', { headers: { 'x-user-token': storedToken } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.error) {
          setUserState(data)
          setToken(storedToken)
        } else {
          deleteCookie(COOKIE_NAME)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const setUser = (u: UserPublic, t: string) => {
    setCookie(COOKIE_NAME, t)
    setUserState(u)
    setToken(t)
    setSignInOpen(false)
  }

  const updateUser = (u: UserPublic) => {
    setUserState(u)
  }

  const clearUser = () => {
    deleteCookie(COOKIE_NAME)
    setUserState(null)
    setToken(null)
  }

  const showSignIn = () => setSignInOpen(true)
  const hideSignIn = () => setSignInOpen(false)

  return (
    <UserContext.Provider value={{ user, token, loading, signInOpen, setUser, updateUser, clearUser, showSignIn, hideSignIn }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
