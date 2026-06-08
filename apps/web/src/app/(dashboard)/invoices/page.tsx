'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2 } from 'lucide-react'
import type { Invoice, Customer } from '@/types'

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

interface LineItemEntry {
  description: string
  quantity: number
  unitPrice: number
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [statusFilter, setStatusFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const limit = 20

  React.useEffect(() => { setPage(1) }, [statusFilter])
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const [form, setForm] = React.useState({
    customerId: '',
    dueDate: '',
    taxRate: 0,
    discount: 0,
    notes: '',
    bookingId: '',
  })
  const [lineItems, setLineItems] = React.useState<LineItemEntry[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/invoices', { params })
      return { items: data.data as Invoice[], meta: data.meta as { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const invoices = invoicesData?.items
  const meta = invoicesData?.meta
  const totalPages = meta?.totalPages ?? 1
  const total = meta?.total ?? 0
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const { data: customers } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/customers')
      return data.data as Customer[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/invoices', {
        customerId: form.customerId,
        dueDate: form.dueDate,
        lineItems: lineItems.filter((li) => li.description.trim()),
        taxRate: form.taxRate || undefined,
        discount: form.discount || undefined,
        notes: form.notes || undefined,
        bookingId: form.bookingId || undefined,
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setDialogOpen(false)
      setForm({ customerId: '', dueDate: '', taxRate: 0, discount: 0, notes: '', bookingId: '' })
      setLineItems([{ description: '', quantity: 1, unitPrice: 0 }])
      addToast('Invoice created', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to create invoice', 'error')
    },
  })

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItemEntry, value: string | number) => {
    const updated = [...lineItems]
    ;(updated[index] as any)[field] = value
    setLineItems(updated)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Customer"
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  options={[
                    { value: '', label: 'Select customer...' },
                    ...(customers?.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })) || []),
                  ]}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Booking ID (optional)"
                value={form.bookingId}
                onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                placeholder="Link to a booking"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                  <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {lineItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                      className="flex-[2]"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                      className="w-20"
                      min={1}
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                      className="w-28"
                      min={0}
                      step="0.01"
                      required
                    />
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                  min={0}
                  step="0.1"
                />
                <Input
                  label="Discount"
                  type="number"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  min={0}
                  step="0.01"
                />
              </div>
              <Input
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" /> : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-1 flex-wrap">
            {statusTabs.map((tab) => (
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
          ) : !invoices?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No invoices found</p>
              <p className="text-sm mt-1">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const invPaid = inv.paidAmount || 0
                    const invProgress = inv.total > 0 ? Math.min(100, (invPaid / inv.total) * 100) : 0
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customer?.firstName} {inv.customer?.lastName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{formatCurrency(inv.total)}</div>
                            {(invPaid > 0 && inv.status !== 'PAID' && inv.status !== 'REFUNDED') && (
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {formatCurrency(invPaid)} paid
                              </div>
                            )}
                            {(invPaid > 0 && inv.status !== 'PAID' && inv.status !== 'REFUNDED') && (
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                                  style={{ width: `${invProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(inv.dueDate, 'MMM d, yyyy')}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell>
                          <Link href={`/invoices/${inv.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {invoices && invoices.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {start}\u2013{end} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
