'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { CreditCard, CheckCircle, XCircle } from 'lucide-react'
import type { PaymentSettings } from '@/types'

export default function PaymentSettingsPage() {
  const { addToast } = useToast()
  const [paystackForm, setPaystackForm] = React.useState({ publicKey: '', secretKey: '' })
  const [flutterwaveForm, setFlutterwaveForm] = React.useState({ publicKey: '', secretKey: '', encryptionKey: '' })

  const { isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await api.get('/payment-settings')
      const settings = data.data as PaymentSettings[]
      settings.forEach((s) => {
        if (s.provider === 'PAYSTACK') {
          setPaystackForm({ publicKey: s.publicKey, secretKey: s.secretKey })
        }
        if (s.provider === 'FLUTTERWAVE') {
          setFlutterwaveForm({ publicKey: s.publicKey, secretKey: s.secretKey, encryptionKey: s.encryptionKey || '' })
        }
      })
      return settings
    },
  })

  const testConnection = async (provider: string) => {
    try {
      const { data } = await api.post('/payment-settings/test', { provider })
      addToast(data.message || `${provider} connection successful`, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Connection failed', 'error')
    }
  }

  const toggleMutation = useMutation({
    mutationFn: async ({ provider, isActive }: { provider: string; isActive: boolean }) => {
      await api.patch(`/payment-settings/${provider}`, { isActive })
    },
    onSuccess: () => addToast('Payment settings updated', 'success'),
    onError: () => addToast('Failed to update', 'error'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your payment providers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Paystack</CardTitle>
          </div>
          <CardDescription>Accept payments via Paystack (Nigeria, Ghana)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); /* save logic */ }} className="space-y-4 max-w-lg">
            <Input label="Public Key" value={paystackForm.publicKey} onChange={(e) => setPaystackForm({ ...paystackForm, publicKey: e.target.value })} />
            <Input label="Secret Key" type="password" value={paystackForm.secretKey} onChange={(e) => setPaystackForm({ ...paystackForm, secretKey: e.target.value })} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => testConnection('PAYSTACK')}>
                Test Connection
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Flutterwave</CardTitle>
          </div>
          <CardDescription>Accept payments via Flutterwave (Africa-wide)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4 max-w-lg">
            <Input label="Public Key" value={flutterwaveForm.publicKey} onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, publicKey: e.target.value })} />
            <Input label="Secret Key" type="password" value={flutterwaveForm.secretKey} onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, secretKey: e.target.value })} />
            <Input label="Encryption Key" type="password" value={flutterwaveForm.encryptionKey} onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, encryptionKey: e.target.value })} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => testConnection('FLUTTERWAVE')}>
                Test Connection
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
