'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Percent, Clock, ArrowUp, ArrowDown, Trash2, Edit3, Calculator } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
}

interface PricingRule {
  id: string
  name: string
  type: 'SURGE' | 'OFF_PEAK' | 'PROMO'
  priority: number
  serviceId: string | null
  daysOfWeek: string[] | null
  startTime: string | null
  endTime: string | null
  minHoursBeforeBooking: number | null
  adjustmentType: string
  adjustmentValue: number
  isActive: boolean
  createdAt: string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

export default function PricingPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editRule, setEditRule] = React.useState<PricingRule | null>(null)
  const [form, setForm] = React.useState({
    name: '',
    type: 'OFF_PEAK',
    priority: '0',
    serviceId: '',
    daysOfWeek: [] as string[],
    startTime: '',
    endTime: '',
    minHoursBeforeBooking: '',
    adjustmentType: 'PERCENTAGE',
    adjustmentValue: '',
    isActive: 'true',
  })

  const [calcServiceId, setCalcServiceId] = React.useState('')
  const [calcDateTime, setCalcDateTime] = React.useState('')
  const [calcResult, setCalcResult] = React.useState<{ finalPrice: number; appliedRules: any[] } | null>(null)
  const [calcLoading, setCalcLoading] = React.useState(false)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const { data } = await api.get('/pricing/rules')
      return data.data as PricingRule[]
    },
  })

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get('/services')
      return data.data as Service[]
    },
  })

  const resetForm = () => {
    setForm({
      name: '', type: 'OFF_PEAK', priority: '0', serviceId: '',
      daysOfWeek: [], startTime: '', endTime: '', minHoursBeforeBooking: '',
      adjustmentType: 'PERCENTAGE', adjustmentValue: '', isActive: 'true',
    })
    setEditRule(null)
  }

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/pricing/rules', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] })
      setFormOpen(false)
      resetForm()
      addToast('Pricing rule created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create rule', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: any }) => {
      const { data } = await api.put(`/pricing/rules/${id}`, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] })
      setFormOpen(false)
      resetForm()
      addToast('Pricing rule updated', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to update rule', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/pricing/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] })
      addToast('Pricing rule deleted', 'success')
    },
    onError: () => addToast('Failed to delete', 'error'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dto = {
      name: form.name,
      type: form.type,
      priority: parseInt(form.priority) || 0,
      serviceId: form.serviceId || null,
      daysOfWeek: form.daysOfWeek.length ? form.daysOfWeek : null,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      minHoursBeforeBooking: form.minHoursBeforeBooking ? parseInt(form.minHoursBeforeBooking) : null,
      adjustmentType: form.adjustmentType,
      adjustmentValue: parseFloat(form.adjustmentValue),
      isActive: form.isActive === 'true',
    }
    if (editRule) {
      updateMutation.mutate({ id: editRule.id, dto })
    } else {
      createMutation.mutate(dto)
    }
  }

  const openEdit = (rule: PricingRule) => {
    setEditRule(rule)
    setForm({
      name: rule.name,
      type: rule.type,
      priority: String(rule.priority),
      serviceId: rule.serviceId || '',
      daysOfWeek: (rule.daysOfWeek as string[]) || [],
      startTime: rule.startTime || '',
      endTime: rule.endTime || '',
      minHoursBeforeBooking: rule.minHoursBeforeBooking != null ? String(rule.minHoursBeforeBooking) : '',
      adjustmentType: rule.adjustmentType,
      adjustmentValue: String(rule.adjustmentValue),
      isActive: String(rule.isActive),
    })
    setFormOpen(true)
  }

  const handleCalculate = async () => {
    if (!calcServiceId || !calcDateTime) return
    setCalcLoading(true)
    setCalcResult(null)
    try {
      const service = services?.find(s => s.id === calcServiceId)
      if (!service) { addToast('Service not found', 'error'); return }
      const { data } = await api.post('/pricing/calculate', {
        serviceId: calcServiceId,
        dateTime: calcDateTime,
        basePrice: service.price,
      })
      setCalcResult(data.data)
    } catch {
      addToast('Calculation failed', 'error')
    } finally {
      setCalcLoading(false)
    }
  }

  const typeColors: Record<string, string> = {
    SURGE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    OFF_PEAK: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PROMO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'SURGE': return <ArrowUp className="h-3 w-3" />
      case 'OFF_PEAK': return <ArrowDown className="h-3 w-3" />
      default: return <Percent className="h-3 w-3" />
    }
  }

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dynamic Pricing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Surge pricing for same-day bookings and discount pricing for off-peak hours
          </p>
        </div>
        <Dialog open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Rule Name" placeholder="e.g. Same-day Surge" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[
                  { value: 'SURGE', label: 'Surge' },
                  { value: 'OFF_PEAK', label: 'Off-Peak' },
                  { value: 'PROMO', label: 'Promo' },
                ]} />
                <Input label="Priority" type="number" placeholder="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </div>
              <Select label="Service (optional, empty = all services)" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                options={[
                  { value: '', label: 'All Services' },
                  ...(services?.map(s => ({ value: s.id, label: s.name })) || []),
                ]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Days of Week</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        form.daysOfWeek.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                <Input label="End Time" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
              <Input label="Min Hours Before Booking (surge: apply if booked within this)" type="number" placeholder="e.g. 24" value={form.minHoursBeforeBooking} onChange={(e) => setForm({ ...form, minHoursBeforeBooking: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Adjustment Type" value={form.adjustmentType} onChange={(e) => setForm({ ...form, adjustmentType: e.target.value })} options={[
                  { value: 'PERCENTAGE', label: 'Percentage' },
                  { value: 'FIXED', label: 'Fixed Amount' },
                ]} />
                <Input label="Value (positive = markup, negative = discount)" type="number" step="0.01" placeholder={form.adjustmentType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'} value={form.adjustmentValue} onChange={(e) => setForm({ ...form, adjustmentValue: e.target.value })} required />
              </div>
              <Select label="Status" value={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.value })} options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editRule ? 'Update Rule' : 'Create Rule'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Calculate Preview
          </CardTitle>
          <CardDescription>Select a service and date/time to preview the calculated price</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Select label="Service" value={calcServiceId} onChange={(e) => setCalcServiceId(e.target.value)}
                options={services?.map(s => ({ value: s.id, label: `${s.name} (${formatCurrency(s.price)})` })) || []}
                placeholder="Select a service"
              />
            </div>
            <div className="flex-1">
              <Input label="Date & Time" type="datetime-local" value={calcDateTime} onChange={(e) => setCalcDateTime(e.target.value)} />
            </div>
            <Button onClick={handleCalculate} disabled={calcLoading || !calcServiceId || !calcDateTime}>
              {calcLoading ? 'Calculating...' : 'Calculate'}
            </Button>
          </div>
          {calcResult && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Base Price:</span>
                <span className="text-sm font-medium">
                  {formatCurrency(services?.find(s => s.id === calcServiceId)?.price || 0)}
                </span>
              </div>
              {calcResult.appliedRules.length > 0 && (
                <div className="space-y-1 mb-2">
                  <span className="text-xs text-gray-400">Applied Rules:</span>
                  {calcResult.appliedRules.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs text-gray-500">
                      <span>{r.name} ({r.type})</span>
                      <span className={r.adjustmentValue >= 0 ? 'text-red-500' : 'text-green-500'}>
                        {r.adjustmentValue >= 0 ? '+' : ''}{r.adjustmentValue}{'%'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold">Final Price:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(calcResult.finalPrice)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? <Spinner /> : !rules?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Percent className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No pricing rules</p>
            <p className="text-sm mt-1">Create surge, off-peak, or promo rules to adjust pricing dynamically</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[rule.type] || 'bg-gray-100'}`}>
                      {typeIcon(rule.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{rule.name}</span>
                        <Badge variant={rule.isActive ? 'success' : 'secondary'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                        <Badge variant="outline" className="text-xs">{rule.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {rule.serviceId ? (
                          <span>Service: {services?.find(s => s.id === rule.serviceId)?.name || 'Unknown'}</span>
                        ) : (
                          <span>All services</span>
                        )}
                        {rule.daysOfWeek && (rule.daysOfWeek as string[]).length > 0 && (
                          <span>Days: {(rule.daysOfWeek as string[]).map(d => DAY_LABELS[d] || d).join(', ')}</span>
                        )}
                        {rule.startTime && rule.endTime && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rule.startTime}-{rule.endTime}</span>
                        )}
                        {rule.minHoursBeforeBooking != null && (
                          <span>Within {rule.minHoursBeforeBooking}h</span>
                        )}
                        <span className="font-medium">
                          {rule.adjustmentType === 'PERCENTAGE' ? `${rule.adjustmentValue}%` : formatCurrency(rule.adjustmentValue)}
                          {rule.adjustmentValue >= 0 ? ' markup' : ' discount'}
                        </span>
                        <span>Priority: {rule.priority}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
