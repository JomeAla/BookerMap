'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Package, Plus, Search, AlertTriangle, Minus, Plus as PlusIcon, Edit, Trash2 } from 'lucide-react'
import type { InventoryItem } from '@/types'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null)

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

  const { data: lowStockItems } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/low-stock')
      return data.data as InventoryItem[]
    },
  })

const categories = React.useMemo(() => {
  if (!items) return []
  const cats = new Set(items.map((i) => i.category).filter((cat): cat is string => cat !== null && cat !== undefined && cat !== ''))
  return Array.from(cats).sort()
}, [items])

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { data } = await api.post('/inventory', form)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
      setAddDialogOpen(false)
      addToast('Item created', 'success')
    },
    onError: () => addToast('Failed to create item', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: any) => {
      const { data } = await api.patch(`/inventory/${id}`, form)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
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
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] })
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to adjust stock', 'error'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} out of stock or low stock
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
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
  value={categoryFilter ?? ''}
  onChange={(e) => setCategoryFilter(e.target.value as string)}
>
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Unit Cost</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No inventory items yet</p>
                  </td>
                </tr>
              ) : (
                items?.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.category || '—'}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                          onClick={() => adjustStockMutation.mutate({ id: item.id, delta: -1 })}
                          disabled={item.quantity <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className={`font-mono font-bold min-w-[3ch] text-right ${item.quantity <= item.lowStockThreshold ? 'text-red-600' : ''}`}>
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
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitCost / 100)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.quantity <= 0 ? (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">Out of Stock</Badge>
                      ) : item.quantity <= item.lowStockThreshold ? (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">In Stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item.id) }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
    </div>
  )
}

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
  onSubmit: (data: any) => void
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
    onSubmit({
      name,
      sku: sku || undefined,
      category: category || undefined,
      description: description || undefined,
      unit,
      unitCost: parseInt(unitCost) || 0,
      quantity: parseInt(quantity) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 5,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
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
            <div>
              <label className="block text-sm font-medium mb-1">Unit Cost (subunit)</label>
              <Input type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
              <Input type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : initial ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
