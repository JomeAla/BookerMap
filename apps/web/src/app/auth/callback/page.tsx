'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setToken, setRefreshToken, setUser } from '@/lib/auth'
import { api } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (accessToken && refreshToken) {
      setToken(accessToken)
      setRefreshToken(refreshToken)
      api.get('/auth/me').then(({ data }) => {
        setUser(data.data || data)
        router.push('/dashboard')
      }).catch(() => {
        router.push('/login')
      })
    } else {
      router.push('/login')
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Spinner size="lg" />
    </div>
  )
}
