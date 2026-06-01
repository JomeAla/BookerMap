'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShieldAlert, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { Dispute, DisputeStatus, DisputeType } from '@/types'

const statusFilters: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'INVESTIGATING', label: 'Investigating' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

const typeFilters: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'CHARGEBACK', label: 'Chargeback' },
  { value: 'SERVICE_NOT_RENDERED', label: 'Not Rendered' },
  { value: 'SERVICE_DEFICIENT', label: 'Deficient' },
  { value: 'DAMAGES', label: 'Damages' },
  { value: 'BILLING_ERROR', label: 'Billing Error' },
  { value: 'OTHER', label: 'Other' },
]

const statusActions: { value: DisputeStatus; label: string }[] = [
  { value: DisputeStatus.OPEN, label: 'Mark Open' },
  { value: DisputeStatus.INVESTIGATING, label: 'Mark Investigating' },
  { value: DisputeStatus.RESOLVED, label: 'Mark Resolved' },
  { value: DisputeStatus.CLOSED, label: 'Mark Closed' },
]

export default function DisputesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('')
  const [statusDialog, setStatusDialog] = React.useState<{ open: boolean; disputeId: string }>({ open: false, disputeId: '' })
  const [newStatus, setNewStatus] = React.useState<DisputeStatus>(DisputeStatus.OPEN)
  const [resolveDialog, setResolveDialog] = React.useState<{ open: boolean; dispute: Dispute | null }>({ open: false, dispute: null })
  const [resolution, setResolution] = React.useState('REFUND_FULL')
  const [resolutionNote, setResolutionNote] = React.useState('')

  const { data: stats } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: async () => {
      const { data } = await api.get('/disputes/stats')
      return data.data as {
        total: number
        statusCounts: Record<string, number>
        totalDisputedAmount: number
        avgResolutionTimeHours: number
        openCount: number
      }
    },
  })

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes', statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/disputes', { params })
      return data.data as Dispute[]
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/disputes/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
      setStatusDialog({ open: false, disputeId: '' })
      addToast('Status updated', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to update status', 'error'),
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution, note }: { id: string; resolution: string; note?: string }) => {
      await api.post(`/disputes/${id}/resolve`, { resolution, note })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
      setResolveDialog({ open: false, dispute: null })
      setResolutionNote('')
      addToast('Dispute resolved', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to resolve dispute', 'error'),
  })

  const summaryCards = [
    { label: 'Open Disputes', value: stats?.openCount ?? 0, icon: ShieldAlert, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    { label: 'Total Disputed', value: formatCurrency(stats?.totalDisputedAmount ?? 0), icon: TrendingUp, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Avg Resolution', value: stats ? `${stats.avgResolutionTimeHours}h` : '-', icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Disputes', value: stats?.total ?? 0, icon: AlertCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ]

  const typeLabels: Record<string, string> = {
    CHARGEBACK: 'Chargeback',
    SERVICE_NOT_RENDERED: 'Not Rendered',
    SERVICE_DEFICIENT: 'Deficient',
    DAMAGES: 'Damages',
    BILLING_ERROR: 'Billing Error',
    OTHER: 'Other',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Disputes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage chargebacks, complaints, and booking disputes</p>
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
          ) : !disputes?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No disputes found</p>
              <p className="text-sm mt-1">All disputes will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {typeLabels[d.type] || d.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {d.customer?.firstName} {d.customer?.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {d.booking ? d.booking.service?.name ?? `#${d.bookingId?.slice(0, 8)}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(d.amount)}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(d.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/disputes/${d.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          {d.status !== 'RESOLVED' && d.status !== 'CLOSED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setStatusDialog({ open: true, disputeId: d.id })
                                  setNewStatus(d.status as DisputeStatus)
                                }}
                              >
                                Status
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-800"
                                onClick={() => {
                                  setResolveDialog({ open: true, dispute: d })
                                  setResolution('REFUND_FULL')
                                  setResolutionNote('')
                                }}
                              >
                                Resolve
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

      <Dialog open={statusDialog.open} onOpenChange={(o) => setStatusDialog({ ...statusDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Dispute Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select
              label="New Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
              options={statusActions.map(a => ({ value: a.value, label: a.label }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStatusDialog({ open: false, disputeId: '' })}>Cancel</Button>
              <Button
                onClick={() => updateStatusMutation.mutate({ id: statusDialog.disputeId, status: newStatus })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? <Spinner size="sm" /> : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveDialog.open} onOpenChange={(o) => setResolveDialog({ ...resolveDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select
              label="Resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              options={[
                { value: 'REFUND_FULL', label: 'Full Refund' },
                { value: 'REFUND_PARTIAL', label: 'Partial Refund' },
                { value: 'CREDIT', label: 'Credit' },
                { value: 'DISMISSED', label: 'Dismissed' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Input
              label="Resolution Note"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Optional note..."
            />
            {resolveDialog.dispute && (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p><strong>Amount in dispute:</strong> {formatCurrency(resolveDialog.dispute.amount)}</p>
                <p><strong>Type:</strong> {typeLabels[resolveDialog.dispute.type]}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResolveDialog({ open: false, dispute: null })}>Cancel</Button>
              <Button
                onClick={() => resolveMutation.mutate({ id: resolveDialog.dispute?.id || '', resolution, note: resolutionNote || undefined })}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? <Spinner size="sm" /> : 'Resolve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
