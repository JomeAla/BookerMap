'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Search, CreditCard, ArrowRightLeft, X, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANTS: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  PAST_DUE: 'secondary',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  TRIALING: 'secondary',
}

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [filterPlan, setFilterPlan] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')

  const [changePlanSub, setChangePlanSub] = React.useState<any>(null)
  const [changePlanForm, setChangePlanForm] = React.useState({ plan: 'BASIC', billingCycle: 'MONTHLY' })
  const [cancelSubTenant, setCancelSubTenant] = React.useState<string | null>(null)
  const [invoiceSubTenant, setInvoiceSubTenant] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions', { params: { page, limit: 20 } })
      return data.data as { data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const updatePlan = useMutation({
    mutationFn: ({ tenantId, plan, billingCycle }: { tenantId: string; plan: string; billingCycle: string }) =>
      api.patch(`/subscriptions/my/plan`, { plan, billingCycle }, { headers: { 'x-tenant-id': tenantId } }),
    onSuccess: () => {
      toast({ title: 'Plan updated', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setChangePlanSub(null)
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error updating plan', variant: 'destructive' }),
  })

  const cancelSubscription = useMutation({
    mutationFn: ({ tenantId, immediate }: { tenantId: string; immediate: boolean }) =>
      api.post(`/subscriptions/my/cancel`, { immediate }, { headers: { 'x-tenant-id': tenantId } }),
    onSuccess: () => {
      toast({ title: 'Subscription cancelled', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setCancelSubTenant(null)
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error cancelling', variant: 'destructive' }),
  })

  const { data: subInvoices, isLoading: subInvoicesLoading } = useQuery({
    queryKey: ['admin-sub-invoices', invoiceSubTenant],
    queryFn: async () => {
      const { data } = await api.get(`/subscriptions/my/invoices`, { headers: { 'x-tenant-id': invoiceSubTenant! } })
      return data.data as any[]
    },
    enabled: !!invoiceSubTenant,
  })

  const filtered = React.useMemo(() => {
    if (!data?.data) return []
    return data.data.filter((sub: any) => {
      if (filterPlan && sub.plan !== filterPlan) return false
      if (filterStatus && sub.status !== filterStatus) return false
      if (search && !sub.tenant?.name?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, search, filterPlan, filterStatus])

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all tenant subscriptions</p>
        </div>
        <Link href="/admin" className="text-sm text-accent hover:underline">
          &larr; Back to Admin
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tenant name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
              <option value="EXPIRED">Expired</option>
              <option value="TRIALING">Trialing</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white block">{sub.tenant?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">{sub.tenantId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-semibold">{sub.plan}</span></TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[sub.status] || 'secondary'}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{sub.billingCycle?.toLowerCase()}</TableCell>
                    <TableCell>{formatCurrency(sub.price / 100, 'NGN')}</TableCell>
                    <TableCell>{formatDate(sub.currentPeriodEnd, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setChangePlanSub(sub); setChangePlanForm({ plan: sub.plan, billingCycle: sub.billingCycle }) }}
                          title="Change plan">
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInvoiceSubTenant(sub.tenantId)}
                          title="View invoices">
                          <FileText className="h-3 w-3" />
                        </Button>
                        {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE' || sub.status === 'TRIALING') && (
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                            onClick={() => setCancelSubTenant(sub.tenantId)} title="Cancel">
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No subscriptions found.</p>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(data.meta.page - 1) * data.meta.limit + 1}–{Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 py-1">{page} / {data.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanSub} onOpenChange={(open) => { if (!open) setChangePlanSub(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              Change Plan — {changePlanSub?.tenant?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Current plan: <strong>{changePlanSub?.plan}</strong> ({changePlanSub?.billingCycle})</p>
            <div>
              <label className="text-sm font-medium mb-1 block">New Plan</label>
              <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={changePlanForm.plan} onChange={(e) => setChangePlanForm({ ...changePlanForm, plan: e.target.value })}>
                <option value="FREE">Free</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
              <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={changePlanForm.billingCycle} onChange={(e) => setChangePlanForm({ ...changePlanForm, billingCycle: e.target.value })}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <Button onClick={() => updatePlan.mutate({ tenantId: changePlanSub.tenantId, ...changePlanForm })}
              disabled={updatePlan.isPending}>
              {updatePlan.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={!!cancelSubTenant} onOpenChange={(open) => { if (!open) setCancelSubTenant(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Are you sure you want to cancel this subscription?</p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => cancelSubscription.mutate({ tenantId: cancelSubTenant!, immediate: true })}
                disabled={cancelSubscription.isPending}>
                Cancel Immediately
              </Button>
              <Button variant="outline" onClick={() => cancelSubscription.mutate({ tenantId: cancelSubTenant!, immediate: false })}
                disabled={cancelSubscription.isPending}>
                Cancel at Period End
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Invoices Dialog */}
      <Dialog open={!!invoiceSubTenant} onOpenChange={(open) => { if (!open) setInvoiceSubTenant(null) }}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Subscription Invoices
            </DialogTitle>
          </DialogHeader>
          {subInvoicesLoading ? <Spinner /> : subInvoices && subInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{formatDate(inv.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(inv.amount / 100, inv.currency || 'NGN')}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'destructive'}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(inv.dueDate, 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-gray-500 py-4 text-center">No invoices found.</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}