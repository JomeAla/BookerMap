'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp, Users, RefreshCw } from 'lucide-react'
import type { SplitPayment, SplitStatus } from '@/types'

const statusFilters: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'REFUNDED', label: 'Refunded' },
]

export default function SplitPaymentsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = React.useState('')

  const { data: payments, isLoading } = useQuery({
    queryKey: ['split-payments', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/split-payments', { params })
      return data.data as SplitPayment[]
    },
  })

  const { data: revenue } = useQuery({
    queryKey: ['split-payments-revenue'],
    queryFn: async () => {
      const { data } = await api.get('/split-payments/revenue')
      return data.data as {
        totalRevenue: number
        totalFees: number
        totalPayouts: number
        pendingFees: number
        releasedFees: number
        onHoldFees: number
        totalTransactions: number
      }
    },
  })

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/split-payments/${id}/release`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-payments'] })
      queryClient.invalidateQueries({ queryKey: ['split-payments-revenue'] })
      addToast('Payment released', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to release payment', 'error'),
  })

  const holdMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/split-payments/${id}/hold`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-payments'] })
      queryClient.invalidateQueries({ queryKey: ['split-payments-revenue'] })
      addToast('Payment put on hold', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to hold payment', 'error'),
  })

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(revenue?.totalRevenue ?? 0), icon: DollarSign, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Platform Fees', value: formatCurrency(revenue?.totalFees ?? 0), icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Provider Payouts', value: formatCurrency(revenue?.totalPayouts ?? 0), icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Transactions', value: revenue?.totalTransactions ?? 0, icon: RefreshCw, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Split Payments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage platform fee splits and provider payouts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-1 flex-wrap">
            {statusFilters.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} /></div>
          ) : !payments?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No split payments found</p>
              <p className="text-sm mt-1">Payments are created automatically when a booking is completed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Platform Fee</TableHead>
                    <TableHead>Provider Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium">{p.booking?.service?.name}</span>
                        <span className="text-gray-400 ml-1">
                          #{p.bookingId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {p.provider?.firstName} {p.provider?.lastName}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(p.totalAmount)}</TableCell>
                      <TableCell className="text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(p.platformFee)}
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(p.providerAmount)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{p.platformRate}%</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(p.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {p.status === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => releaseMutation.mutate(p.id)}
                                disabled={releaseMutation.isPending}
                                className="text-green-600 hover:text-green-800"
                              >
                                Release
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => holdMutation.mutate(p.id)}
                                disabled={holdMutation.isPending}
                                className="text-orange-600 hover:text-orange-800"
                              >
                                Hold
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
