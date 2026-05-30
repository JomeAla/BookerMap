'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CreditCard, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  BASIC: { monthly: 9900, yearly: 99900 },
  PRO: { monthly: 29900, yearly: 299900 },
  ENTERPRISE: { monthly: 99900, yearly: 999900 },
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

const STATUS_VARIANTS: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  PAST_DUE: 'secondary',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  TRIALING: 'secondary',
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionSettingsPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [showChangePlan, setShowChangePlan] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)
  const [selectedCycle, setSelectedCycle] = React.useState<'MONTHLY' | 'YEARLY'>('MONTHLY')

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/my')
      return data.data as any
    },
  })

  const { data: invoices } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/my/invoices')
      return data.data as any[]
    },
  })

  const changePlan = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/subscriptions/my/plan', {
        plan: selectedPlan,
        billingCycle: selectedCycle,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      addToast('Plan updated successfully', 'success')
      setShowChangePlan(false)
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to update plan', 'error')
    },
  })

  const cancelSub = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/subscriptions/my/cancel', { immediate: false })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
      addToast('Subscription will be canceled at period end', 'success')
      setShowCancelDialog(false)
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to cancel subscription', 'error')
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your plan and billing</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Current Plan</CardTitle>
            </div>
            <Badge variant={STATUS_VARIANTS[subscription?.status] || 'secondary'}>
              {subscription?.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {PLAN_LABELS[subscription.plan] || subscription.plan}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Billing Cycle</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {subscription.billingCycle?.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(subscription.price / 100, 'NGN')}/{subscription.billingCycle?.toLowerCase() === 'yearly' ? 'yr' : 'mo'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Period End</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(subscription.currentPeriodEnd, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowChangePlan(true)}>
                  Change Plan
                </Button>
                {subscription.plan !== 'FREE' && subscription.status === 'ACTIVE' && (
                  <Button variant="outline" onClick={() => setShowCancelDialog(true)}>
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active subscription found.</p>
          )}
        </CardContent>
      </Card>

      {showChangePlan && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Plan</CardTitle>
            <CardDescription>Select a new plan and billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedCycle === 'MONTHLY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCycle('MONTHLY')}
                >
                  Monthly
                </Button>
                <Button
                  variant={selectedCycle === 'YEARLY' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCycle('YEARLY')}
                >
                  Yearly
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(PLAN_PRICES).map(([planKey, prices]) => {
                  const isCurrent = subscription.plan === planKey && subscription.billingCycle === selectedCycle
                  const price = selectedCycle === 'MONTHLY' ? prices.monthly : prices.yearly
                  return (
                    <button
                      key={planKey}
                      onClick={() => setSelectedPlan(planKey)}
                      className={`text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedPlan === planKey
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : isCurrent
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{PLAN_LABELS[planKey]}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(price / 100, 'NGN')}
                      </p>
                      <p className="text-xs text-gray-500">
                        /{selectedCycle === 'MONTHLY' ? 'month' : 'year'}
                      </p>
                      {isCurrent && <Badge variant="success" className="mt-2">Current</Badge>}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => changePlan.mutate()}
                  disabled={!selectedPlan || changePlan.isPending || selectedPlan === subscription.plan && selectedCycle === subscription.billingCycle}
                >
                  {changePlan.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {subscription.plan === 'FREE' ? 'Upgrade' : selectedPlan === 'FREE' ? 'Downgrade' : 'Change Plan'}
                </Button>
                <Button variant="outline" onClick={() => setShowChangePlan(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
          <CardDescription>Recent invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatCurrency(inv.amount / 100, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{inv.reference || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showCancelDialog}
        title="Cancel Subscription"
        message="Your subscription will be canceled at the end of the current billing period. You will lose access to premium features after that date."
        onConfirm={() => cancelSub.mutate()}
        onCancel={() => setShowCancelDialog(false)}
        loading={cancelSub.isPending}
      />
    </div>
  )
}
