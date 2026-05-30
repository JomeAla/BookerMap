'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { CreditCard, CheckCircle, XCircle, Globe, Save, Loader2, MessageCircle } from 'lucide-react'
import type { PaymentSettings } from '@/types'

export default function PaymentSettingsPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await api.get('/payments/settings')
      return data.data as PaymentSettings[]
    },
  })

  const paystackSettings = settings?.find((s) => s.provider === 'PAYSTACK')
  const flutterwaveSettings = settings?.find((s) => s.provider === 'FLUTTERWAVE')
  const whatsappSettings = settings?.find((s) => s.provider === 'WHATSAPP')

  const [paystackForm, setPaystackForm] = React.useState({ publicKey: '', secretKey: '' })
  const [flutterwaveForm, setFlutterwaveForm] = React.useState({ publicKey: '', secretKey: '', encryptionKey: '' })
  const [whatsappForm, setWhatsappForm] = React.useState({ whatsappPhoneNumberId: '', whatsappBusinessAccountId: '', whatsappAccessToken: '' })

  React.useEffect(() => {
    if (paystackSettings) {
      setPaystackForm({ publicKey: paystackSettings.publicKey, secretKey: '' })
    }
    if (flutterwaveSettings) {
      setFlutterwaveForm({ publicKey: flutterwaveSettings.publicKey, secretKey: '', encryptionKey: '' })
    }
    if (whatsappSettings) {
      setWhatsappForm({
        whatsappPhoneNumberId: whatsappSettings.whatsappPhoneNumberId || '',
        whatsappBusinessAccountId: whatsappSettings.whatsappBusinessAccountId || '',
        whatsappAccessToken: '',
      })
    }
  }, [paystackSettings, flutterwaveSettings, whatsappSettings])

  const savePaystack = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/settings/paystack', paystackForm)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      addToast('Paystack settings saved', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to save Paystack settings', 'error')
    },
  })

  const saveFlutterwave = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/settings/flutterwave', flutterwaveForm)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      addToast('Flutterwave settings saved', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to save Flutterwave settings', 'error')
    },
  })

  const saveWhatsApp = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/settings/whatsapp', whatsappForm)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      addToast('WhatsApp settings saved', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to save WhatsApp settings', 'error')
    },
  })

  const testConnection = useMutation({
    mutationFn: async (provider: string) => {
      const { data } = await api.post('/payments/settings/validate', { provider })
      return data
    },
    onSuccess: (data) => {
      addToast(data.message || 'Connection successful', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Connection failed', 'error')
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ provider, isActive }: { provider: string; isActive: boolean }) => {
      const { data } = await api.put('/payments/settings', { provider, isActive })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      addToast('Provider status updated', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to update status', 'error')
    },
  })

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your payment providers</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Paystack</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {paystackSettings && (
                <Badge variant={paystackSettings.isActive ? 'success' : 'secondary'}>
                  {paystackSettings.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
              {paystackSettings && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleActive.mutate({ provider: 'PAYSTACK', isActive: !paystackSettings.isActive })
                  }
                >
                  {paystackSettings.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              )}
            </div>
          </div>
          <CardDescription>Accept payments via Paystack (Nigeria, Ghana)</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              savePaystack.mutate()
            }}
            className="space-y-4 max-w-lg"
          >
            <Input
              label="Public Key"
              placeholder="pk_live_..."
              value={paystackForm.publicKey}
              onChange={(e) => setPaystackForm({ ...paystackForm, publicKey: e.target.value })}
            />
            <Input
              label="Secret Key"
              type="password"
              placeholder={paystackSettings ? '•••••••• (leave blank to keep current)' : 'sk_live_...'}
              value={paystackForm.secretKey}
              onChange={(e) => setPaystackForm({ ...paystackForm, secretKey: e.target.value })}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => testConnection.mutate('PAYSTACK')}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={savePaystack.isPending}>
                {savePaystack.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Flutterwave</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {flutterwaveSettings && (
                <Badge variant={flutterwaveSettings.isActive ? 'success' : 'secondary'}>
                  {flutterwaveSettings.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
              {flutterwaveSettings && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleActive.mutate({ provider: 'FLUTTERWAVE', isActive: !flutterwaveSettings.isActive })
                  }
                >
                  {flutterwaveSettings.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              )}
            </div>
          </div>
          <CardDescription>Accept payments via Flutterwave (Africa-wide)</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveFlutterwave.mutate()
            }}
            className="space-y-4 max-w-lg"
          >
            <Input
              label="Public Key"
              placeholder="FLWPUBK-..."
              value={flutterwaveForm.publicKey}
              onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, publicKey: e.target.value })}
            />
            <Input
              label="Secret Key"
              type="password"
              placeholder={flutterwaveSettings ? '•••••••• (leave blank to keep current)' : 'FLWSECK-...'}
              value={flutterwaveForm.secretKey}
              onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, secretKey: e.target.value })}
            />
            <Input
              label="Encryption Key"
              type="password"
              placeholder={flutterwaveSettings ? '•••••••• (leave blank to keep current)' : 'FLWSECK_...'}
              value={flutterwaveForm.encryptionKey}
              onChange={(e) => setFlutterwaveForm({ ...flutterwaveForm, encryptionKey: e.target.value })}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => testConnection.mutate('FLUTTERWAVE')}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={saveFlutterwave.isPending}>
                {saveFlutterwave.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">WhatsApp Business</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {whatsappSettings && (
                <Badge variant={whatsappSettings.isActive ? 'success' : 'secondary'}>
                  {whatsappSettings.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>Configure WhatsApp Business API for booking notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveWhatsApp.mutate()
            }}
            className="space-y-4 max-w-lg"
          >
            <Input
              label="Phone Number ID"
              placeholder="123456789012345"
              value={whatsappForm.whatsappPhoneNumberId}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsappPhoneNumberId: e.target.value })}
            />
            <Input
              label="Business Account ID"
              placeholder="123456789012345"
              value={whatsappForm.whatsappBusinessAccountId}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsappBusinessAccountId: e.target.value })}
            />
            <Input
              label="Access Token"
              type="password"
              placeholder={whatsappSettings ? '•••••••• (leave blank to keep current)' : 'EAAx...'}
              value={whatsappForm.whatsappAccessToken}
              onChange={(e) => setWhatsappForm({ ...whatsappForm, whatsappAccessToken: e.target.value })}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={saveWhatsApp.isPending}>
                {saveWhatsApp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook URLs</CardTitle>
          <CardDescription>Add these URLs to your payment provider dashboard for automatic payment updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Paystack Webhook URL</label>
            <div className="mt-1 flex gap-2">
              <code className="flex-1 block bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm break-all">
                {typeof window !== 'undefined' && `${window.location.origin}/api/v1/payments/webhooks/paystack`}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/api/v1/payments/webhooks/paystack`)
                    addToast('Copied to clipboard', 'success')
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Flutterwave Webhook URL</label>
            <div className="mt-1 flex gap-2">
              <code className="flex-1 block bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm break-all">
                {typeof window !== 'undefined' && `${window.location.origin}/api/v1/payments/webhooks/flutterwave`}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/api/v1/payments/webhooks/flutterwave`)
                    addToast('Copied to clipboard', 'success')
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
