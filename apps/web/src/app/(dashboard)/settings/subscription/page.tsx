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
import { useTenantCurrency } from '@/hooks/useTenantCurrency'
import { CreditCard, AlertCircle, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

const STATUS_VARIANTS: Record<string, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  TRIALING: 'secondary',
}

const PENDING_CHECKOUT_KEY = 'bm_pending_sub_checkout'

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
  const { currency } = useTenantCurrency()
  const queryClient = useQueryClient()
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [showChangePlan, setShowChangePlan] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)
  const [selectedCycle, setSelectedCycle] = React.useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [selectedProvider, setSelectedProvider] = React.useState<'PAYSTACK' | 'FLUTTERWAVE'>('PAYSTACK')
  const [pendingCheckout, setPendingCheckout] = React.useState<{ plan: string; billingCycle: string; reference: string; created: string } | null>(null)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_CHECKOUT_KEY)
      if (raw) setPendingCheckout(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

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

  const { data: planPricing, isLoading: plansLoading } = useQuery({
    queryKey: ['plan-pricing-public'],
    queryFn: async () => {
      const { data } = await api.get('/plan-pricing')
      return data.data as any[]
    },
  })

  const checkout = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/subscriptions/my/checkout', {
        plan: selectedPlan,
        billingCycle: selectedCycle,
        provider: selectedProvider,
      })
      return data
    },
    onSuccess: (res) => {
      const payload = res.data
      if (payload.free) {
        addToast('Plan updated', 'success')
        queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
        setShowChangePlan(false)
        return
      }
      const authUrl: string = payload.authorizationUrl
      if (authUrl) {
        localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
          plan: selectedPlan,
          billingCycle: selectedCycle,
          reference: payload.reference,
          created: new Date().toISOString(),
        }))
        setPendingCheckout({ plan: selectedPlan!, billingCycle: selectedCycle, reference: payload.reference, created: new Date().toISOString() })
        window.location.href = authUrl
      } else {
        addToast('Checkout returned no payment link', 'error')
      }
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to start checkout', 'error')
    },
  })

  const verifyCheckout = useMutation({
    mutationFn: async (reference: string) => {
      const { data } = await api.get(`/subscriptions/my/checkout/verify/${reference}`)
      return data
    },
    onSuccess: (res) => {
      const payload = res.data
      if (payload.status === 'SUCCESS' || payload.subscription) {
        addToast('Payment received — your plan is now active', 'success')
        localStorage.removeItem(PENDING_CHECKOUT_KEY)
        setPendingCheckout(null)
        queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
        queryClient.invalidateQueries({ queryKey: ['my-invoices'] })
        setShowChangePlan(false)
      } else if (payload.status === 'PENDING') {
        addToast('Payment is still being processed. Please complete it in the payment window, then verify again.', 'error')
      } else {
        addToast('Payment was not completed. Please try again.', 'error')
        localStorage.removeItem(PENDING_CHECKOUT_KEY)
        setPendingCheckout(null)
      }
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to verify payment', 'error')
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

      {pendingCheckout && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Payment In Progress
            </CardTitle>
            <CardDescription>
              You have an outstanding checkout for {PLAN_LABELS[pendingCheckout.plan] || pendingCheckout.plan} (
              {pendingCheckout.billingCycle?.toLowerCase()}). If you already completed payment in the provider window, verify it below. Otherwise open the payment page again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => verifyCheckout.mutate(pendingCheckout.reference)} disabled={verifyCheckout.isPending}>
              {verifyCheckout.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verify My Payment
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(PENDING_CHECKOUT_KEY)
                setPendingCheckout(null)
              }}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
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
                    {formatCurrency(subscription.price / 100, currency)}/{subscription.billingCycle?.toLowerCase() === 'yearly' ? 'yr' : 'mo'}
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
                <Button onClick={() => setShowChangePlan(true)} disabled={!!pendingCheckout}>
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
            <CardTitle className="text-base">Choose a Plan</CardTitle>
            <CardDescription>Select a plan and billing cycle, then pay securely via your preferred provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedCycle === 'MONTHLY' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCycle('MONTHLY')}
                >
                  Monthly
                </Button>
                <Button
                  variant={selectedCycle === 'YEARLY' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCycle('YEARLY')}
                >
                  Yearly
                </Button>
              </div>

              {plansLoading && <div className="flex justify-center py-6"><Spinner /></div>}

              {!plansLoading && planPricing && planPricing.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {planPricing
                    .filter((p) => p.billingCycle === selectedCycle && p.isActive)
                    .map((p) => {
                      const isCurrent = subscription.plan === p.plan && subscription.billingCycle === p.billingCycle
                      const selected = selectedPlan === p.plan
                      return (
                        <button
                          key={`${p.plan}-${p.billingCycle}`}
                          onClick={() => setSelectedPlan(p.plan)}
                          className={`text-left p-4 rounded-lg border-2 transition-colors ${
                            selected
                              ? 'border-accent bg-accent/10'
                              : isCurrent
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-default'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold text-gray-900 dark:text-white">{PLAN_LABELS[p.plan] || p.plan}</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                            {formatCurrency(p.price / 100, currency)}
                          </p>
                          <p className="text-xs text-gray-500">
                            /{selectedCycle === 'MONTHLY' ? 'month' : 'year'}
                          </p>
                          {p.smsCredits > 0 && <p className="text-xs text-gray-500 mt-1">{p.smsCredits} SMS credits</p>}
                          {p.whatsappCredits > 0 && <p className="text-xs text-gray-500">{p.whatsappCredits} WhatsApp credits</p>}
                          {isCurrent && <Badge variant="success" className="mt-2">Current</Badge>}
                        </button>
                      )
                    })}
                </div>
              )}

              {!plansLoading && planPricing && planPricing.length === 0 && (
                <p className="text-sm text-gray-500">No pricing configured yet. Please contact support.</p>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Pay with</p>
                <div className="flex gap-2">
                  <Button
                    variant={selectedProvider === 'PAYSTACK' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedProvider('PAYSTACK')}
                  >
                    Paystack
                  </Button>
                  <Button
                    variant={selectedProvider === 'FLUTTERWAVE' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedProvider('FLUTTERWAVE')}
                  >
                    Flutterwave
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => checkout.mutate()}
                  disabled={!selectedPlan || checkout.isPending || (selectedPlan === subscription.plan && selectedCycle === subscription.billingCycle && subscription.status === 'ACTIVE')}
                >
                  {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {selectedPlan === 'FREE'
                    ? 'Switch to Free'
                    : subscription.plan === 'FREE'
                    ? 'Proceed to Payment'
                    : 'Pay & Upgrade'}
                  <ExternalLink className="h-4 w-4 ml-1" />
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