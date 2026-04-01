'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@/types/database'

type UserContextType = {
  user: User | null
  token: string | null
  loading: boolean
  setUser: (user: User, token: string) => void
  updateUser: (user: User) => void
  clearUser: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  token: null,
  loading: true,
  setUser: () => {},
  updateUser: () => {},
  clearUser: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('gs_token')
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
          localStorage.removeItem('gs_token')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const setUser = (u: User, t: string) => {
    localStorage.setItem('gs_token', t)
    setUserState(u)
    setToken(t)
  }

  const updateUser = (u: User) => {
    setUserState(u)
  }

  const clearUser = () => {
    localStorage.removeItem('gs_token')
    setUserState(null)
    setToken(null)
  }

  return (
    <UserContext.Provider value={{ user, token, loading, setUser, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
