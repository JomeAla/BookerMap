'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import {
  Package, Plus, Search, AlertTriangle, Minus, Plus as PlusIcon,
  Edit, Trash2, ChevronDown, ChevronRight, ClipboardList,
  DollarSign, Layers, Hash,
} from 'lucide-react'
import type { InventoryItem, Booking, BookingInventory } from '@/types'

interface UsageReportEntry {
  item: InventoryItem
  totalUsed: number
  totalCost: number
  usages: (BookingInventory & { booking?: Booking })[]
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // state
  const [tab, setTab] = React.useState<'all' | 'low'>('all')
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null)
  const [adjustItem, setAdjustItem] = React.useState<InventoryItem | null>(null)
  const [usageDialogOpen, setUsageDialogOpen] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<InventoryItem | null>(null)
  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportStartDate, setReportStartDate] = React.useState('')
  const [reportEndDate, setReportEndDate] = React.useState('')
  const [reportQuery, setReportQuery] = React.useState<{ startDate?: string; endDate?: string }>({})
  const [expandedReportRows, setExpandedReportRows] = React.useState<Set<string>>(new Set())

  // queries
  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      const { data } = await api.get(`/inventory?${params}`)
      return data.data as InventoryItem[]
    },
  })

  const { data: bookings } = useQuery({
    queryKey: ['bookings-for-inventory'],
    queryFn: async () => {
      const { data } = await api.get('/bookings')
      return data.data as Booking[]
    },
  })

  const { data: reportData, isFetching: reportLoading } = useQuery({
    queryKey: ['inventory-report', reportQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (reportQuery.startDate) params.set('startDate', reportQuery.startDate)
      if (reportQuery.endDate) params.set('endDate', reportQuery.endDate)
      const { data } = await api.get(`/inventory/report?${params}`)
      return data.data as UsageReportEntry[]
    },
    enabled: !!reportQuery.startDate || !!reportQuery.endDate,
  })

  // computed
  const categories = React.useMemo(() => {
    if (!items) return []
    const cats = new Set(
      items
        .map((i) => i.category)
        .filter((cat): cat is string => cat !== null && cat !== undefined && cat !== ''),
    )
    return Array.from(cats).sort()
  }, [items])

  const summary = React.useMemo(() => {
    if (!items) return { total: 0, lowStock: 0, totalValue: 0, categoryCount: 0 }
    const lowStock = items.filter((i) => i.quantity <= i.lowStockThreshold).length
    const totalValue = items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0)
    const categorySet = new Set(items.map((i) => i.category).filter(Boolean))
    return { total: items.length, lowStock, totalValue, categoryCount: categorySet.size }
  }, [items])

  const filteredItems = React.useMemo(() => {
    if (!items) return []
    if (tab === 'low') return items.filter((i) => i.quantity <= i.lowStockThreshold)
    return items
  }, [items, tab])

  // mutations
  const createMutation = useMutation({
    mutationFn: async (form: Record<string, unknown>) => {
      const { data } = await api.post('/inventory', form)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setAddDialogOpen(false)
      addToast('Item created', 'success')
    },
    onError: () => addToast('Failed to create item', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.patch(`/inventory/${id}`, form)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setEditItem(null)
      addToast('Item updated', 'success')
    },
    onError: () => addToast('Failed to update item', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDeleteConfirm(null)
      addToast('Item deleted', 'success')
    },
    onError: () => addToast('Failed to delete item', 'error'),
  })

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const { data } = await api.post(`/inventory/${id}/adjust`, { delta })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setAdjustItem(null)
      addToast('Stock adjusted', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to adjust stock', 'error'),
  })

  const logUsageMutation = useMutation({
    mutationFn: async (form: { bookingId: string; itemId: string; quantity: number }) => {
      const { data } = await api.post('/inventory/usage', form)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setUsageDialogOpen(false)
      addToast('Usage logged', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to log usage', 'error'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track stock, usage, and costs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setUsageDialogOpen(true)}>
            <ClipboardList className="h-4 w-4 mr-2" /> Log Usage
          </Button>
          <Button variant="outline" onClick={() => setReportOpen(!reportOpen)}>
            <ClipboardList className="h-4 w-4 mr-2" />
            {reportOpen ? 'Hide Report' : 'Usage Report'}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card className={summary.lowStock > 0 ? 'border-amber-300 dark:border-amber-700' : ''}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
              summary.lowStock > 0
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {summary.lowStock > 0
                ? <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                : <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              }
            </div>
            <div>
              <p className={`text-2xl font-bold ${summary.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                {summary.lowStock}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary.totalValue / 100)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Stock Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.categoryCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Categories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Banner */}
      {summary.lowStock > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {summary.lowStock} item{summary.lowStock !== 1 ? 's' : ''} at or below low stock threshold
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tab Bar + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800/50">
          {(['all', 'low'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'all' ? 'All Items' : 'Low Stock'}
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Unit</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Quantity</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <Package className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium">No inventory items</p>
                      <p className="text-sm mt-1">Add items to start tracking your inventory</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.quantity <= item.lowStockThreshold
                    const isOut = item.quantity <= 0
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          isLow ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{item.category || '—'}</td>
                        <td className="px-4 py-3">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.unitCost / 100)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                              onClick={() => adjustStockMutation.mutate({ id: item.id, delta: -1 })}
                              disabled={item.quantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className={`font-mono font-bold min-w-[3ch] text-right ${isLow ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {item.quantity}
                            </span>
                            <button
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                              onClick={() => adjustStockMutation.mutate({ id: item.id, delta: 1 })}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">In Stock</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setAdjustItem(item)} title="Adjust stock">
                              <Hash className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(item)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage Report Section */}
      {reportOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Usage Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label="Start Date"
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
              <Button
                onClick={() => setReportQuery({
                  ...(reportStartDate ? { startDate: new Date(reportStartDate).toISOString() } : {}),
                  ...(reportEndDate ? { endDate: new Date(reportEndDate).toISOString() } : {}),
                })}
                disabled={reportLoading}
              >
                Generate
              </Button>
            </div>

            {reportData && reportData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 w-8" />
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Item Name</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Total Units Used</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Total Cost</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Booking Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((entry) => {
                      const isExpanded = expandedReportRows.has(entry.item.id)
                      return (
                        <React.Fragment key={entry.item.id}>
                          <tr
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                            onClick={() => {
                              const next = new Set(expandedReportRows)
                              if (next.has(entry.item.id)) next.delete(entry.item.id)
                              else next.add(entry.item.id)
                              setExpandedReportRows(next)
                            }}
                          >
                            <td className="px-4 py-3">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                              }
                            </td>
                            <td className="px-4 py-3 font-medium">{entry.item.name}</td>
                            <td className="px-4 py-3 text-right font-mono">{entry.totalUsed}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatCurrency(entry.totalCost / 100)}</td>
                            <td className="px-4 py-3 text-right font-mono">{entry.usages.length}</td>
                          </tr>
                          {isExpanded && entry.usages.map((u, idx) => (
                            <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-800/30">
                              <td />
                              <td className="px-4 py-2 text-xs text-gray-500" colSpan={2}>
                                Booking #{u.bookingId?.slice(-8) || ''}
                              </td>
                              <td className="px-4 py-2 text-right text-xs font-mono">{u.quantityUsed} {entry.item.unit}</td>
                              <td className="px-4 py-2 text-right text-xs font-mono">{formatCurrency((u.quantityUsed * u.unitCostAtTime) / 100)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {reportData && reportData.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-500">No usage data for the selected period.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Item Dialog */}
      <ItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      {editItem && (
        <ItemDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null) }}
          initial={editItem}
          onSubmit={(data) => updateMutation.mutate({ id: editItem.id, ...data })}
          loading={updateMutation.isPending}
        />
      )}

      {/* Adjust Stock Dialog */}
      {adjustItem && (
        <AdjustStockDialog
          item={adjustItem}
          open={!!adjustItem}
          onOpenChange={(open) => { if (!open) setAdjustItem(null) }}
          onSubmit={(delta) => adjustStockMutation.mutate({ id: adjustItem.id, delta })}
          loading={adjustStockMutation.isPending}
        />
      )}

      {/* Log Usage Dialog */}
      <LogUsageDialog
        open={usageDialogOpen}
        onOpenChange={setUsageDialogOpen}
        items={items || []}
        bookings={bookings || []}
        onSubmit={(data) => logUsageMutation.mutate(data)}
        loading={logUsageMutation.isPending}
      />

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Item</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function ItemDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: InventoryItem
  onSubmit: (data: Record<string, unknown>) => void
  loading: boolean
}) {
  const [name, setName] = React.useState(initial?.name || '')
  const [sku, setSku] = React.useState(initial?.sku || '')
  const [category, setCategory] = React.useState(initial?.category || '')
  const [description, setDescription] = React.useState(initial?.description || '')
  const [unit, setUnit] = React.useState(initial?.unit || 'piece')
  const [unitCost, setUnitCost] = React.useState(initial ? String(initial.unitCost) : '0')
  const [quantity, setQuantity] = React.useState(initial ? String(initial.quantity) : '0')
  const [lowStockThreshold, setLowStockThreshold] = React.useState(initial ? String(initial.lowStockThreshold) : '5')

  React.useEffect(() => {
    if (initial) {
      setName(initial.name)
      setSku(initial.sku || '')
      setCategory(initial.category || '')
      setDescription(initial.description || '')
      setUnit(initial.unit)
      setUnitCost(String(initial.unitCost))
      setQuantity(String(initial.quantity))
      setLowStockThreshold(String(initial.lowStockThreshold))
    }
  }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = { name, unit }
    if (sku) payload.sku = sku
    if (category) payload.category = category
    if (description) payload.description = description
    payload.unitCost = parseInt(unitCost, 10) || 0
    payload.quantity = parseInt(quantity, 10) || 0
    payload.lowStockThreshold = parseInt(lowStockThreshold, 10) || 5
    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="piece">Piece</option>
                <option value="liter">Liter</option>
                <option value="kg">Kg</option>
                <option value="meter">Meter</option>
                <option value="box">Box</option>
                <option value="set">Set</option>
              </select>
            </div>
            <Input label="Unit Cost (subunits)" type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Initial Quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Input label="Low Stock Threshold" type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initial ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AdjustStockDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (delta: number) => void
  loading: boolean
}) {
  const [delta, setDelta] = React.useState('')
  const [note, setNote] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseInt(delta, 10)
    if (isNaN(value) || value === 0) return
    onSubmit(value)
  }

  React.useEffect(() => {
    if (open) { setDelta(''); setNote('') }
  }, [open])

  const parsedDelta = parseInt(delta, 10) || 0
  const newQuantity = item.quantity + parsedDelta

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
            <p className="text-sm text-gray-500">{item.name}</p>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">
              {item.quantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
            </p>
          </div>
          <Input
            label="Adjustment (+ / -)"
            type="number"
            placeholder="e.g. 5 or -3"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            required
          />
          {parsedDelta !== 0 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-medium text-center ${
              parsedDelta > 0
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : newQuantity < 0
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            }`}>
              New quantity: <span className="font-mono font-bold">{newQuantity}</span>
              {newQuantity < 0 && ' (would be negative!)'}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || parsedDelta === 0 || newQuantity < 0}>
              {loading ? 'Adjusting...' : `Adjust ${parsedDelta >= 0 ? '+' : ''}${parsedDelta || ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LogUsageDialog({
  open,
  onOpenChange,
  items,
  bookings,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: InventoryItem[]
  bookings: Booking[]
  onSubmit: (data: { bookingId: string; itemId: string; quantity: number }) => void
  loading: boolean
}) {
  const [bookingId, setBookingId] = React.useState('')
  const [itemId, setItemId] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [bookingSearch, setBookingSearch] = React.useState('')

  const filteredBookings = React.useMemo(() => {
    if (!bookingSearch) return bookings.slice(0, 50)
    const s = bookingSearch.toLowerCase()
    return bookings.filter(
      (b) =>
        b.id.toLowerCase().includes(s) ||
        `${b.customer?.firstName} ${b.customer?.lastName}`.toLowerCase().includes(s),
    ).slice(0, 50)
  }, [bookings, bookingSearch])

  const selectedItem = items.find((i) => i.id === itemId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseInt(quantity, 10)
    if (!bookingId || !itemId || isNaN(qty) || qty < 1) return
    onSubmit({ bookingId, itemId, quantity: qty })
  }

  React.useEffect(() => {
    if (open) { setBookingId(''); setItemId(''); setQuantity('1'); setBookingSearch('') }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Item Usage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Booking</label>
            <Input
              placeholder="Search booking by ID or customer..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
            <select
              className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1 text-sm mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              required
            >
              <option value="">Choose a booking...</option>
              {filteredBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id.slice(-8)} — {b.service?.name || 'Service'} ({b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'N/A'})
                </option>
              ))}
            </select>
          </div>
          <Select
            label="Select Item"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="Choose an item..."
            options={items.map((i) => ({
              value: i.id,
              label: `${i.name} (${i.quantity} in stock)`,
            }))}
            required
          />
          <Input
            label={`Quantity${selectedItem ? ` (${selectedItem.unit})` : ''}`}
            type="number"
            min="1"
            max={selectedItem?.quantity || undefined}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          {selectedItem && selectedItem.quantity > 0 && (
            <p className="text-xs text-gray-500">Available: {selectedItem.quantity} {selectedItem.unit}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !bookingId || !itemId}>
              {loading ? 'Logging...' : 'Log Usage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
