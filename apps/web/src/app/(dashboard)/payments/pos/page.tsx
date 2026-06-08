'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils'
import { CreditCard, Monitor, Receipt, DollarSign, RefreshCw } from 'lucide-react'
import type { Terminal, Payment } from '@/types'

interface PosPayment extends Payment {
  invoice?: { invoiceNumber: string; customer?: { firstName: string; lastName: string } }
}

export default function PosPaymentPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [selectedTerminal, setSelectedTerminal] = React.useState('')
  const [selectedProvider, setSelectedProvider] = React.useState<'paystack' | 'flutterwave'>('paystack')
  const [invoiceRef, setInvoiceRef] = React.useState('')
  const [bookingRef, setBookingRef] = React.useState('')
  const [processing, setProcessing] = React.useState(false)
  const [activePaymentRef, setActivePaymentRef] = React.useState<string | null>(null)

  const { data: terminals, isLoading: terminalsLoading } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const { data } = await api.get('/payments/terminals')
      return data.data as Terminal[]
    },
    refetchInterval: activePaymentRef ? 30000 : false,
  })

  const { data: posTransactions, isLoading: txLoading } = useQuery({
    queryKey: ['pos-transactions'],
    queryFn: async () => {
      const { data } = await api.get('/payments/pos')
      return data.data as PosPayment[]
    },
    refetchInterval: activePaymentRef ? 10000 : false,
  })

  const processMutation = useMutation({
    mutationFn: async (body: {
      amount: number; terminalId?: string; provider: string; invoiceId?: string; bookingId?: string
    }) => {
      const { data } = await api.post('/payments/pos/initialize', body)
      return data.data as { reference: string; timeout?: number; note?: string }
    },
    onSuccess: (result) => {
      setActivePaymentRef(result.reference)
      addToast(`Payment sent to terminal. Reference: ${result.reference}`, 'success')
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pos-transactions'] })
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to initialize POS payment', 'error')
    },
    onSettled: () => setProcessing(false),
  })

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const { data } = await api.post(`/payments/pos/verify/${reference}`)
      return data.data as { status: string; amount?: number }
    },
    onSuccess: (result) => {
      if (result.status === 'success') {
        addToast('Payment completed successfully', 'success')
        setActivePaymentRef(null)
      } else {
        addToast('Payment still pending on terminal', 'warning')
      }
      queryClient.invalidateQueries({ queryKey: ['pos-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['terminals'] })
    },
    onError: () => addToast('Failed to verify payment', 'error'),
  })

  function handleProcessPayment() {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast('Enter a valid amount', 'error')
      return
    }
    setProcessing(true)
    processMutation.mutate({
      amount: amt,
      terminalId: selectedTerminal || undefined,
      provider: selectedProvider,
      invoiceId: invoiceRef || undefined,
      bookingId: bookingRef || undefined,
    })
  }

  const activeTerminals = (terminals || []).filter((t) => t.status === 'online' || t.status === 'active')
  const todayTx = (posTransactions || []).filter((t) => {
    const d = new Date(t.createdAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  const todayVolume = todayTx
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0)

  React.useEffect(() => {
    if (!dialogOpen) {
      setAmount('')
      setSelectedTerminal('')
      setSelectedProvider('paystack')
      setInvoiceRef('')
      setBookingRef('')
    }
  }, [dialogOpen])

  if (terminalsLoading && txLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage point-of-sale terminal payments</p>
        </div>
        <div className="flex items-center gap-3">
          {activePaymentRef && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => verifyMutation.mutate(activePaymentRef)}
              disabled={verifyMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
              Verify Active Payment
            </Button>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <CreditCard className="h-4 w-4 mr-2" /> Process Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Monitor className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Terminals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeTerminals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's POS Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayTx.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(todayVolume)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terminals</CardTitle>
        </CardHeader>
        <CardContent>
          {!terminals || terminals.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No terminals configured. Set up your Paystack terminals first.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        terminal.status === 'online' || terminal.status === 'active'
                          ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                          : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {terminal.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {terminal.id}
                    </p>
                    {terminal.lastSeen && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Last seen: {timeAgo(terminal.lastSeen)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent POS Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!posTransactions || posTransactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No POS transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {formatDate(tx.createdAt, 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {tx.providerRef?.includes('TML') ? 'Terminal' : tx.provider}
                    </TableCell>
                    <TableCell>
                      {tx.invoice ? (
                        <span className="text-sm">
                          {tx.invoice.invoiceNumber}
                          {tx.invoice.customer && (
                            <span className="text-gray-400 ml-1">
                              — {tx.invoice.customer.firstName} {tx.invoice.customer.lastName}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-500 max-w-[160px] truncate">
                      {tx.providerRef || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Terminal Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              label="Terminal"
              options={[
                { value: '', label: 'Auto-select terminal' },
                ...(terminals || []).map((t) => ({
                  value: t.id,
                  label: `${t.name} ${t.status === 'online' || t.status === 'active' ? '(Online)' : '(Offline)'}`,
                })),
              ]}
              value={selectedTerminal}
              onChange={(e) => setSelectedTerminal(e.target.value)}
            />

            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              step="0.01"
            />

            <Input
              label="Invoice Reference"
              type="text"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="Invoice ID (optional)"
            />

            <Input
              label="Booking Reference"
              type="text"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="Booking ID (optional)"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <select
                className="flex h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'paystack' | 'flutterwave')}
              >
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleProcessPayment} disabled={processing || !amount}>
                {processing ? 'Sending...' : 'Send to Terminal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activePaymentRef && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="w-80 shadow-lg border-blue-300 dark:border-blue-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Active Payment</p>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <p className="text-xs font-mono text-gray-500 break-all">{activePaymentRef}</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => verifyMutation.mutate(activePaymentRef)}
                disabled={verifyMutation.isPending}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                {verifyMutation.isPending ? 'Verifying...' : 'Verify Payment'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
