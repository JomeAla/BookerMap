'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getToken, setToken, removeToken, setUser, getUser, isAuthenticated } from '@/lib/auth'
import type { User } from '@/types'

export function useAuth() {
  const router = useRouter()
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated()) {
      setUserState(getUser())
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const payload = res.data.data
    setToken(payload.accessToken)
    setUser(payload.user)
    setUserState(payload.user)
    return payload.user
  }, [])

  const register = useCallback(async (payload: { businessName: string; email: string; password: string }) => {
    const { data } = await api.post('/auth/register', payload)
    setToken(data.token)
    setUser(data.user)
    setUserState(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setUserState(null)
    router.push('/login')
  }, [router])

  return { user, loading, login, register, logout, isAuthenticated: !!user }
}
