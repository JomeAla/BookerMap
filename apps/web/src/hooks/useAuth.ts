'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getToken, setToken, setRefreshToken, removeToken, setUser, getUser, isAuthenticated, getRefreshToken } from '@/lib/auth'
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
    setRefreshToken(payload.refreshToken)
    setUser(payload.user)
    setUserState(payload.user)
    return payload.user
  }, [])

  const register = useCallback(async (payload: { firstName: string; lastName: string; email: string; password: string; tenantSlug: string }) => {
    await api.post('/auth/register', payload)
    const loginRes = await api.post('/auth/login', { email: payload.email, password: payload.password })
    const loginPayload = loginRes.data.data
    setToken(loginPayload.accessToken)
    setRefreshToken(loginPayload.refreshToken)
    setUser(loginPayload.user)
    setUserState(loginPayload.user)
    return loginPayload.user
  }, [])

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken()
    removeToken()
    setUserState(null)
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    router.push('/login')
  }, [router])

  const forgotPassword = useCallback(async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await api.post('/auth/reset-password', { token, password })
    return res.data
  }, [])

  return { user, loading, login, register, logout, forgotPassword, resetPassword, isAuthenticated: !!user }
}
