'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Repeat, ToggleLeft, ToggleRight, Eye } from 'lucide-react'
import type { RecurringPayment } from '@/types'

function FrequencyLabel({ freq }: { freq: string }) {
  const labels: Record<string, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly' }
  return <span>{labels[freq] || freq}</span>
}

export default function RecurringPaymentsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [viewId, setViewId] = React.useState<string | null>(null)

  const { data: payments, isLoading } = useQuery({
    queryKey: ['recurring-payments'],
    queryFn: async () => {
      const { data } = await api.get('/recurring-payments')
      return data.data as RecurringPayment[]
    },
  })

  const { data: detail } = useQuery({
    queryKey: ['recurring-payment', viewId],
    queryFn: async () => {
      const { data } = await api.get(`/recurring-payments/${viewId}`)
      return data.data as any
    },
    enabled: !!viewId,
  })

  const { data: logs } = useQuery({
    queryKey: ['recurring-payment-logs', viewId],
    queryFn: async () => {
      const { data } = await api.get(`/recurring-payments/${viewId}/logs`)
      return data.data as any[]
    },
    enabled: !!viewId,
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => await api.patch(`/recurring-payments/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-payments'] })
      if (viewId) queryClient.invalidateQueries({ queryKey: ['recurring-payment', viewId] })
      addToast('Recurring payment updated', 'success')
    },
    onError: () => addToast('Failed to update recurring payment', 'error'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage automated recurring charges</p>
        </div>
      </div>

      {!viewId ? (
        isLoading ? <Spinner /> : !payments?.length ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <Repeat className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No recurring payments</p>
              <p className="text-sm mt-1">Recurring charges are created when customers authorize them during checkout</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((rp) => (
              <Card key={rp.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                        <Repeat className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(rp as any).service?.name || 'Unknown Service'}
                          </span>
                          <Badge variant="outline" className="text-xs"><FrequencyLabel freq={rp.frequency} /></Badge>
                          <Badge variant={rp.isActive ? 'success' : 'secondary'}>{rp.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {(rp as any).customer?.firstName} {(rp as any).customer?.lastName} &middot; {rp.paymentMethod}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{formatCurrency(rp.amount)} per <FrequencyLabel freq={rp.frequency} /></span>
                          <span>Next: {formatDate(rp.nextPaymentAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setViewId(rp.id)} title="View Details">
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate(rp.id)} title={rp.isActive ? 'Pause' : 'Resume'}>
                        {rp.isActive
                          ? <ToggleRight className="h-5 w-5 text-green-500" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setViewId(null)}>&larr; Back to list</Button>

          {detail && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Payment Details</CardTitle>
                  <Badge variant={detail.isActive ? 'success' : 'secondary'}>{detail.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Service</p>
                    <p className="font-medium">{detail.service?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{detail.customer?.firstName} {detail.customer?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium">{formatCurrency(detail.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Frequency</p>
                    <p className="font-medium"><FrequencyLabel freq={detail.frequency} /></p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Method</p>
                    <p className="font-medium">{detail.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Next Payment</p>
                    <p className="font-medium">{formatDate(detail.nextPaymentAt)}</p>
                  </div>
                  {detail.endDate && (
                    <div>
                      <p className="text-gray-500">End Date</p>
                      <p className="font-medium">{formatDate(detail.endDate)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Logs</CardTitle>
              <CardDescription>Recent charge attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {!logs?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">No logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={log.status === 'SUCCESS' ? 'success' : 'destructive'}>{log.status}</Badge>
                        <span className="text-gray-600 dark:text-gray-400">{log.message}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {log.reference && <span>Ref: {log.reference}</span>}
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
