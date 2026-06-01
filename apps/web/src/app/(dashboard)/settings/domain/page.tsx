'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Globe, CheckCircle2, AlertCircle, Loader2, Copy, Trash2 } from 'lucide-react'

interface DomainConfig {
  domain: string | null
  cnameRecord: { name: string; type: string; value: string; ttl: string; description: string }
  txtRecord: { name: string; type: string; value: string; ttl: string; description: string }
  verificationStatus: string
  instructions: string[]
}

export default function DomainSettingsPage() {
  const { addToast } = useToast()
  const [domainInput, setDomainInput] = React.useState('')

  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['domain-config'],
    queryFn: async () => {
      const { data } = await api.get('/tenants/domain/config')
      return data.data as DomainConfig
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/tenants/domain/add', { domain: domainInput })
      return data.data
    },
    onSuccess: () => {
      addToast('Domain added successfully', 'success')
      setDomainInput('')
      refetch()
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to add domain', 'error')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ force }: { force: boolean }) => {
      const { data } = await api.post('/tenants/domain/verify', { force })
      return data.data
    },
    onSuccess: () => {
      addToast('Domain verified successfully', 'success')
      refetch()
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Verification failed', 'error')
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/tenants/domain/remove')
      return data.data
    },
    onSuccess: () => {
      addToast('Domain removed', 'success')
      refetch()
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to remove domain', 'error')
    },
  })

  if (isLoading) return <Spinner />

  const hasDomain = config?.domain

  const VerificationBadge = () => {
    if (!hasDomain) return null
    if (config?.verificationStatus === 'verified') {
      return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>
    }
    return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Domain</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Use your own domain name for the booking portal
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Domain Configuration</CardTitle>
            <VerificationBadge />
          </div>
          <CardDescription>
            Set up a custom domain like bookings.yourcompany.com for your booking portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasDomain ? (
            <form
              onSubmit={(e) => { e.preventDefault(); if (domainInput) addMutation.mutate() }}
              className="flex gap-3 items-end"
            >
              <div className="flex-1">
                <Input
                  label="Custom Domain"
                  placeholder="bookings.mycompany.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={addMutation.isPending || !domainInput}>
                {addMutation.isPending ? <Spinner size="sm" /> : 'Add Domain'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{config!.domain}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate({ force: false })}
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Verify Domain
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate({ force: true })}
                    disabled={verifyMutation.isPending}
                    title="Skip DNS check and force verify"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('Remove custom domain? This will unlink your domain from this tenant.')) {
                        removeMutation.mutate()
                      }
                    }}
                    disabled={removeMutation.isPending}
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasDomain && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">DNS Configuration</CardTitle>
              <CardDescription>
                Add these records to your domain provider&apos;s DNS settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">CNAME Record</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const val = `${config!.cnameRecord.type} ${config!.cnameRecord.name} -> ${config!.cnameRecord.value}`
                        navigator.clipboard.writeText(val)
                        addToast('Copied to clipboard', 'success')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Type:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{config!.cnameRecord.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Name:</span>
                      <span className="text-gray-900 dark:text-white">{config!.cnameRecord.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Value:</span>
                      <span className="text-blue-600 dark:text-blue-400">{config!.cnameRecord.value}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">TTL:</span>
                      <span className="text-gray-900 dark:text-white">{config!.cnameRecord.ttl}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">TXT Verification Record</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(config!.txtRecord.value)
                        addToast('Copied to clipboard', 'success')
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Type:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{config!.txtRecord.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Name:</span>
                      <span className="text-gray-900 dark:text-white">{config!.txtRecord.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-12">Value:</span>
                      <span className="text-green-600 dark:text-green-400 break-all">{config!.txtRecord.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Instructions</CardTitle>
              <CardDescription>Follow these steps to configure your custom domain</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                {config!.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
