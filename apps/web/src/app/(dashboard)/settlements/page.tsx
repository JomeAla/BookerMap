'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp, CheckCircle, XCircle, ChevronDown, ChevronUp, Plus, Users } from 'lucide-react'
import type { Settlement, SettlementLineItem, User } from '@/types'

const statusFilters: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
]

const settlementBadgeVariant = (status: string) => {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'secondary',
    PROCESSING: 'default',
    COMPLETED: 'default',
    FAILED: 'destructive',
  }
  return map[status] || 'secondary'
}

export default function SettlementsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [generateOpen, setGenerateOpen] = React.useState(false)
  const [completeOpen, setCompleteOpen] = React.useState<string | null>(null)
  const [failOpen, setFailOpen] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({ providerId: '', periodStart: '', periodEnd: '' })
  const [completeForm, setCompleteForm] = React.useState({ paymentMethod: '', paymentReference: '' })
  const [failNotes, setFailNotes] = React.useState('')

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/settlements', { params })
      return data.data as Settlement[]
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['settlements-summary'],
    queryFn: async () => {
      const { data } = await api.get('/settlements/summary')
      return data.data as {
        totalOutstanding: number
        totalProcessing: number
        totalCompleted: number
        totalFailed: number
        totalSettlements: number
        pendingCount: number
        processingCount: number
        completedCount: number
        failedCount: number
      }
    },
  })

  const { data: team } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return (data.data as User[]).filter(u => u.role === 'TECHNICIAN')
    },
    enabled: generateOpen,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/settlements/generate', form)
      return data.data as Settlement
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-summary'] })
      addToast('Settlement generated', 'success')
      setGenerateOpen(false)
      setForm({ providerId: '', periodStart: '', periodEnd: '' })
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to generate settlement', 'error'),
  })

  const processMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/settlements/${id}/process`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-summary'] })
      addToast('Settlement marked as processing', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to process settlement', 'error'),
  })

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/settlements/${completeOpen}/complete`, completeForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-summary'] })
      addToast('Settlement completed', 'success')
      setCompleteOpen(null)
      setCompleteForm({ paymentMethod: '', paymentReference: '' })
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to complete settlement', 'error'),
  })

  const failMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/settlements/${failOpen}/fail`, { notes: failNotes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements-summary'] })
      addToast('Settlement marked as failed', 'success')
      setFailOpen(null)
      setFailNotes('')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to mark settlement as failed', 'error'),
  })

  const { data: expandedSettlement } = useQuery({
    queryKey: ['settlement', expandedId],
    queryFn: async () => {
      const { data } = await api.get(`/settlements/${expandedId}`)
      return data.data as Settlement & { lineItems: SettlementLineItem[] }
    },
    enabled: !!expandedId,
  })

  const summaryCards = [
    { label: 'Total Outstanding', value: formatCurrency(summary?.totalOutstanding ?? 0), count: summary?.pendingCount ?? 0, icon: DollarSign, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Processing', value: formatCurrency(summary?.totalProcessing ?? 0), count: summary?.processingCount ?? 0, icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Completed', value: formatCurrency(summary?.totalCompleted ?? 0), count: summary?.completedCount ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Failed', value: formatCurrency(summary?.totalFailed ?? 0), count: summary?.failedCount ?? 0, icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settlements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reconcile provider earnings and track payouts
          </p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger>
            <Button><Plus className="h-4 w-4 mr-2" /> Generate Settlement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Settlement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select
                label="Provider"
                value={form.providerId}
                onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                options={(team || []).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                placeholder="Select a provider"
              />
              <Input
                label="Period Start"
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              />
              <Input
                label="Period End"
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={!form.providerId || !form.periodStart || !form.periodEnd || generateMutation.isPending}
                >
                  Generate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                    <p className="text-xs text-gray-400">{card.count} settlement{card.count !== 1 ? 's' : ''}</p>
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
          ) : !settlements?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No settlements found</p>
              <p className="text-sm mt-1">Generate a settlement to reconcile provider payouts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((s) => (
                    <React.Fragment key={s.id}>
                      <TableRow>
                        <TableCell>
                          <button
                            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedId === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{formatDate(s.periodStart, 'MMM d')}</span>
                          <span className="text-gray-400 mx-1">-</span>
                          <span className="font-medium">{formatDate(s.periodEnd, 'MMM d, yyyy')}</span>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {s.provider?.firstName} {s.provider?.lastName}
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(s.totalEarned)}</TableCell>
                        <TableCell className="text-sm text-green-600 dark:text-green-400">{formatCurrency(s.totalFee)}</TableCell>
                        <TableCell className="text-sm font-bold">{formatCurrency(s.netAmount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {s.paidAt ? formatDate(s.paidAt, 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {s.status === 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => processMutation.mutate(s.id)}
                                disabled={processMutation.isPending}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Process
                              </Button>
                            )}
                            {(s.status === 'PENDING' || s.status === 'PROCESSING') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setCompleteOpen(s.id); setCompleteForm({ paymentMethod: '', paymentReference: '' }) }}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Complete
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setFailOpen(s.id); setFailNotes('') }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Fail
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === s.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-gray-50 dark:bg-gray-800/50 p-4">
                            {expandedSettlement?.id === s.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Total Earned:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(expandedSettlement.totalEarned)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Fees:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(expandedSettlement.totalFee)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Net:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(expandedSettlement.netAmount)}</span>
                                  </div>
                                  {expandedSettlement.paymentMethod && (
                                    <div>
                                      <span className="text-gray-500">Method:</span>
                                      <span className="ml-2 font-medium">{expandedSettlement.paymentMethod}</span>
                                    </div>
                                  )}
                                  {expandedSettlement.paymentReference && (
                                    <div>
                                      <span className="text-gray-500">Reference:</span>
                                      <span className="ml-2 font-medium">{expandedSettlement.paymentReference}</span>
                                    </div>
                                  )}
                                  {expandedSettlement.notes && (
                                    <div className="col-span-3">
                                      <span className="text-gray-500">Notes:</span>
                                      <span className="ml-2">{expandedSettlement.notes}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Line Items ({expandedSettlement.lineItems?.length || 0})
                                  </h4>
                                  {expandedSettlement.lineItems && expandedSettlement.lineItems.length > 0 ? (
                                    <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Booking</TableHead>
                                            <TableHead>Date</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {expandedSettlement.lineItems.map((li) => (
                                            <TableRow key={li.id}>
                                              <TableCell className="text-sm">{li.description || '-'}</TableCell>
                                              <TableCell className="text-sm font-medium">{formatCurrency(li.amount)}</TableCell>
                                              <TableCell className="text-sm">
                                                {li.booking
                                                  ? `${li.booking.service?.name || 'Booking'} - ${li.booking.customer?.firstName || ''} ${li.booking.customer?.lastName || ''}`
                                                  : li.bookingId?.slice(0, 8) || '-'}
                                              </TableCell>
                                              <TableCell className="text-sm text-gray-500">
                                                {formatDate(li.createdAt, 'MMM d, yyyy')}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400">No line items</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-sm text-gray-400">Loading...</div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!completeOpen} onOpenChange={(o) => { if (!o) setCompleteOpen(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Settlement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              label="Payment Method"
              value={completeForm.paymentMethod}
              onChange={(e) => setCompleteForm({ ...completeForm, paymentMethod: e.target.value })}
              placeholder="Bank Transfer, Mobile Money, etc."
            />
            <Input
              label="Payment Reference"
              value={completeForm.paymentReference}
              onChange={(e) => setCompleteForm({ ...completeForm, paymentReference: e.target.value })}
              placeholder="Transaction reference"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCompleteOpen(null)}>Cancel</Button>
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={!completeForm.paymentMethod || !completeForm.paymentReference || completeMutation.isPending}
              >
                Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!failOpen} onOpenChange={(o) => { if (!o) setFailOpen(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Settlement as Failed</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Failure Notes</label>
              <textarea
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={failNotes}
                onChange={(e) => setFailNotes(e.target.value)}
                placeholder="Reason for failure..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setFailOpen(null)}>Cancel</Button>
              <Button
                onClick={() => failMutation.mutate()}
                disabled={!failNotes.trim() || failMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                Mark Failed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
