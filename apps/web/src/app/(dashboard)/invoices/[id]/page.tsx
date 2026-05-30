'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, User, Mail, Calendar, DollarSign, FileText, Send, CheckCircle, Ban, Download, RotateCcw } from 'lucide-react'
import { Select } from '@/components/ui/select'
import type { Invoice, Payment, SavedCard } from '@/types'

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data } = await api.get(`/invoices/${id}`)
      return data.data as Invoice
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/invoices/${id}/send`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      addToast('Invoice sent to customer', 'success')
    },
    onError: () => addToast('Failed to send invoice', 'error'),
  })

  const payMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/invoices/${id}/pay`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      addToast('Invoice marked as paid', 'success')
    },
    onError: () => addToast('Failed to mark as paid', 'error'),
  })

  const [posDialogOpen, setPosDialogOpen] = React.useState(false)
  const [posReference, setPosReference] = React.useState('')
  const [posStatus, setPosStatus] = React.useState<string | null>(null)
  const [posLoading, setPosLoading] = React.useState(false)

  const [chargeDialogOpen, setChargeDialogOpen] = React.useState(false)
  const [chargeCardId, setChargeCardId] = React.useState<string | null>(null)
  const [chargeLoading, setChargeLoading] = React.useState(false)

  const { data: savedCards } = useQuery({
    queryKey: ['customer-cards', invoice?.customerId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/cards/${invoice?.customerId}`)
      return data.data as SavedCard[]
    },
    enabled: !!invoice?.customerId && invoice?.status !== 'PAID' && invoice?.status !== 'CANCELLED',
  })

  const [refundDialogOpen, setRefundDialogOpen] = React.useState(false)
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null)
  const [refundAmount, setRefundAmount] = React.useState('')
  const [refundReason, setRefundReason] = React.useState('')
  const [refundError, setRefundError] = React.useState('')

  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, amount }: { paymentId: string; amount: number }) => {
      const { data } = await api.post('/payments/refund', { paymentId, amount })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      addToast('Refund processed successfully', 'success')
      setRefundDialogOpen(false)
      setSelectedPayment(null)
      setRefundAmount('')
      setRefundReason('')
      setRefundError('')
    },
    onError: () => addToast('Failed to process refund', 'error'),
  })

  function openRefundDialog(payment: Payment) {
    setSelectedPayment(payment)
    setRefundAmount(String(payment.amount))
    setRefundReason('')
    setRefundError('')
    setRefundDialogOpen(true)
  }

  function handleRefundSubmit() {
    if (!selectedPayment) return
    const amount = Number(refundAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setRefundError('Amount must be greater than 0')
      return
    }
    if (amount > selectedPayment.amount) {
      setRefundError('Amount cannot exceed payment amount')
      return
    }
    setRefundError('')
    refundMutation.mutate({ paymentId: selectedPayment.id, amount })
  }

  async function handleGeneratePos() {
    if (!invoice) return
    setPosLoading(true)
    setPosStatus(null)
    try {
      const { data } = await api.post('/payments/pos/initialize', {
        amount: invoice.total,
        provider: 'paystack',
        invoiceId: invoice.id,
      })
      setPosReference(data.data.reference)
      setPosStatus('initialized')
      addToast('POS payment initialized', 'success')
    } catch {
      addToast('Failed to initialize POS payment', 'error')
    } finally {
      setPosLoading(false)
    }
  }

  async function handleVerifyPos() {
    if (!posReference) return
    setPosLoading(true)
    try {
      const { data } = await api.post(`/payments/pos/verify/${posReference}`)
      setPosStatus(data.data.status === 'success' ? 'completed' : 'failed')
      if (data.data.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] })
        addToast('POS payment verified', 'success')
      } else {
        addToast('POS payment not yet completed', 'warning')
      }
    } catch {
      addToast('Failed to verify POS payment', 'error')
    } finally {
      setPosLoading(false)
    }
  }

  async function handleChargeCard(cardId: string) {
    if (!invoice?.customer?.email) return
    setChargeCardId(cardId)
    setChargeLoading(true)
    try {
      await api.post(`/payments/cards/${cardId}/charge`, {
        amount: invoice.total,
        email: invoice.customer.email,
      })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      addToast('Saved card charged successfully', 'success')
      setChargeDialogOpen(false)
    } catch {
      addToast('Failed to charge saved card', 'error')
    } finally {
      setChargeCardId(null)
      setChargeLoading(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (!invoice) return <div className="text-center py-12 text-gray-500">Invoice not found</div>

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Created {formatDate(invoice.createdAt, 'MMM d, yyyy')}</p>
          </div>
          <StatusBadge status={invoice.status} className="text-sm px-3 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{invoice.customer?.firstName} {invoice.customer?.lastName}</span>
            </div>
            {invoice.customer?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{invoice.customer.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Due {formatDate(invoice.dueDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-semibold">{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paidAt && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Paid {formatDate(invoice.paidAt, 'MMM d, yyyy')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invoice.status === 'DRAFT' && (
              <Button className="w-full" size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                <Send className="h-4 w-4 mr-2" /> Send Invoice
              </Button>
            )}
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <>
                <Button className="w-full" size="sm" variant="secondary" onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                </Button>
                <Button className="w-full" size="sm" variant="outline" onClick={() => setPosDialogOpen(true)}>
                  Pay with POS
                </Button>
                {savedCards && savedCards.length > 0 && (
                  <Button className="w-full" size="sm" variant="outline" onClick={() => setChargeDialogOpen(true)}>
                    Charge Saved Card
                  </Button>
                )}
              </>
            )}
            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/invoices/${id}/pdf`} target="_blank" className="block">
              <Button className="w-full" size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </a>
            {invoice.booking && (
              <Link href={`/bookings/${invoice.booking.id}`}>
                <Button className="w-full" size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" /> View Booking
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Discount</span>
              <span className="text-red-500">-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Tax ({invoice.taxRate}%)</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">{formatDate(payment.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="text-sm">{payment.provider}</TableCell>
                    <TableCell className="text-sm font-mono">{payment.providerRef || '—'}</TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={payment.status !== 'SUCCESS'}
                        onClick={() => openRefundDialog(payment)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refund
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>POS Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Amount: {formatCurrency(invoice?.total || 0)}
            </p>
            {!posReference ? (
              <Button className="w-full" onClick={handleGeneratePos} disabled={posLoading}>
                {posLoading ? 'Initializing...' : 'Generate POS Payment'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reference Code</p>
                  <p className="text-sm font-mono font-bold break-all">{posReference}</p>
                </div>
                {posStatus === 'initialized' && (
                  <Button className="w-full" variant="secondary" onClick={handleVerifyPos} disabled={posLoading}>
                    {posLoading ? 'Checking...' : 'Verify Payment'}
                  </Button>
                )}
                {posStatus === 'completed' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Payment Completed</p>
                  </div>
                )}
                {posStatus === 'failed' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Payment Failed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chargeDialogOpen} onOpenChange={setChargeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Charge Saved Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Amount: {formatCurrency(invoice?.total || 0)}
            </p>
            {savedCards?.map((card) => (
              <div key={card.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium capitalize">{card.brand}</span> ****{card.last4}
                  {card.expMonth && card.expYear && (
                    <span className="text-gray-500 ml-2">Exp {card.expMonth}/{card.expYear}</span>
                  )}
                  {card.isDefault && <span className="ml-2 text-xs text-blue-600">Default</span>}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleChargeCard(card.id)}
                  disabled={chargeLoading && chargeCardId === card.id}
                >
                  {chargeLoading && chargeCardId === card.id ? 'Charging...' : 'Charge'}
                </Button>
              </div>
            ))}
            {(!savedCards || savedCards.length === 0) && (
              <p className="text-sm text-gray-500 text-center">No saved cards available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Process Refund</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Payment amount: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount)}</span>
              </div>
            )}
            <Input
              label="Refund Amount"
              type="number"
              value={refundAmount}
              onChange={(e) => { setRefundAmount(e.target.value); setRefundError('') }}
              error={refundError}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason (optional)</label>
              <textarea
                className="flex w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={refundMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleRefundSubmit} disabled={refundMutation.isPending}>
                {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
