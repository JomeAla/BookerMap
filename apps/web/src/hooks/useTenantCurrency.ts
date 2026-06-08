'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

const CURRENCY_KEY = 'bm_tenant_currency'

export function useTenantCurrency() {
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === 'undefined') return 'NGN'
    return localStorage.getItem(CURRENCY_KEY) || 'NGN'
  })

  useEffect(() => {
    async function fetchCurrency() {
      try {
        const { data } = await api.get('/tenant')
        const tenantCurrency = data.data?.currency || 'NGN'
        setCurrency(tenantCurrency)
        localStorage.setItem(CURRENCY_KEY, tenantCurrency)
      } catch {}
    }
    fetchCurrency()
  }, [])

  return { currency }
}