'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { Plus, Tag, Percent, DollarSign, Calendar, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  type: string
  value: number
  maxUses: number | null
  usedCount: number
  minAmount: number | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function CouponsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ code: '', type: 'percentage', value: '', maxUses: '', minAmount: '', expiresAt: '' })

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data } = await api.get('/coupons')
      return data.data as Coupon[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/coupons', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setShowForm(false)
      setForm({ code: '', type: 'percentage', value: '', maxUses: '', minAmount: '', expiresAt: '' })
      addToast('Coupon created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create coupon', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      addToast('Coupon deleted', 'success')
    },
    onError: () => addToast('Failed to delete', 'error'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      code: form.code,
      type: form.type,
      value: parseFloat(form.value),
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      minAmount: form.minAmount ? parseFloat(form.minAmount) : null,
      expiresAt: form.expiresAt || null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupon Codes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and manage promotional codes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> New Coupon
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Coupon</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <Input label="Code" placeholder="SUMMER20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <Input label="Value" type="number" step="0.01" placeholder={form.type === 'percentage' ? '10' : '1000'} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max Uses (optional)" type="number" placeholder="100" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
                <Input label="Min Amount (optional)" type="number" step="0.01" placeholder="5000" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
              </div>
              <Input label="Expires At (optional)" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>Create Coupon</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? <Spinner /> : !coupons?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No coupon codes</p>
            <p className="text-sm mt-1">Create your first promotional code to start offering discounts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 dark:text-white">{c.code}</span>
                        <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {c.type === 'percentage' ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                          {c.type === 'percentage' ? `${c.value}% off` : `$${c.value} off`}
                        </span>
                        <span>{c.usedCount}/{c.maxUses || '∞'} used</span>
                        {c.minAmount && <span>Min: ${c.minAmount}</span>}
                        {c.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {formatDate(c.expiresAt, 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
