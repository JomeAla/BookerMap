'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import type { Customer, Service, User } from '@/types'

interface QuickBookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date | null
  selectedTime?: string | null
  onSuccess: () => void
}

export function QuickBookingModal({ open, onOpenChange, selectedDate, selectedTime, onSuccess }: QuickBookingModalProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [error, setError] = React.useState('')

  const defaultStartTime = React.useMemo(() => {
    if (selectedDate && selectedTime) {
      const [h, m] = selectedTime.split(':')
      const d = new Date(selectedDate)
      d.setHours(parseInt(h), parseInt(m), 0, 0)
      return d
    }
    if (selectedDate && !selectedTime) {
      const d = new Date(selectedDate)
      d.setHours(9, 0, 0, 0)
      return d
    }
    return new Date()
  }, [selectedDate, selectedTime])

  const toLocalDatetime = (d: Date) => {
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  const [form, setForm] = React.useState({
    customerId: '',
    customerSearch: '',
    serviceId: '',
    startTime: toLocalDatetime(defaultStartTime),
    duration: 60,
    technicianId: '',
    notes: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        customerId: '',
        customerSearch: '',
        serviceId: '',
        startTime: toLocalDatetime(defaultStartTime),
        duration: 60,
        technicianId: '',
        notes: '',
      })
      setError('')
    }
  }, [open, defaultStartTime])

  const { data: customers } = useQuery({
    queryKey: ['customers-quick-booking', form.customerSearch],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (form.customerSearch) params.search = form.customerSearch
      const { data } = await api.get('/customers', { params })
      return data.data as Customer[]
    },
    enabled: open,
  })

  const { data: services } = useQuery({
    queryKey: ['services-quick-booking'],
    queryFn: async () => {
      const { data } = await api.get('/services')
      return data.data as Service[]
    },
    enabled: open,
  })

  const { data: technicians } = useQuery({
    queryKey: ['technicians-quick-booking'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { role: 'TECHNICIAN' } })
      return data.data as User[]
    },
    enabled: open,
  })

  const selectedService = services?.find(s => s.id === form.serviceId)

  React.useEffect(() => {
    if (selectedService) {
      setForm(f => ({ ...f, duration: selectedService.duration }))
    }
  }, [form.serviceId, selectedService])

  const createMutation = useMutation({
    mutationFn: async () => {
      const startTime = new Date(form.startTime).toISOString()
      const { data } = await api.post('/bookings', {
        customerId: form.customerId,
        serviceId: form.serviceId,
        startTime,
        technicianId: form.technicianId || undefined,
        notes: form.notes || undefined,
      })
      return data.data
    },
    onSuccess: () => {
      addToast('Booking created successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      onSuccess()
      onOpenChange(false)
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || 'Failed to create booking'
      setError(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.customerId) { setError('Please select a customer'); return }
    if (!form.serviceId) { setError('Please select a service'); return }
    createMutation.mutate()
  }

  const filteredCustomers = React.useMemo(() => {
    if (!customers) return []
    return customers.filter(c =>
      !form.customerSearch ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(form.customerSearch.toLowerCase()) ||
      c.phone.includes(form.customerSearch)
    )
  }, [customers, form.customerSearch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
            <Input
              placeholder="Search by name or phone..."
              value={form.customerSearch}
              onChange={(e) => {
                setForm({ ...form, customerSearch: e.target.value, customerId: '' })
              }}
            />
            {filteredCustomers.length > 0 && !form.customerId && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => {
                      setForm(f => ({ ...f, customerId: c.id, customerSearch: `${c.firstName} ${c.lastName}` }))
                    }}
                  >
                    {c.firstName} {c.lastName}
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {form.customerId && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setForm(f => ({ ...f, customerId: '', customerSearch: '' }))}
              >
                Change customer
              </button>
            )}
          </div>

          <Select
            label="Service"
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            options={[
              { value: '', label: 'Select service...' },
              ...(services?.map(s => ({ value: s.id, label: `${s.name} (${s.duration}min)` })) || []),
            ]}
            required
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            required
          />

          <Input
            label={`Duration (minutes)${selectedService ? ` — ${selectedService.name}: ${selectedService.duration}min` : ''}`}
            type="number"
            min={15}
            step={15}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 60 })}
          />

          <Select
            label="Technician (optional)"
            value={form.technicianId}
            onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
            options={[
              { value: '', label: 'Auto-assign' },
              ...(technicians?.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })) || []),
            ]}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="flex h-20 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              placeholder="Special instructions..."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner size="sm" /> : 'Create Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
