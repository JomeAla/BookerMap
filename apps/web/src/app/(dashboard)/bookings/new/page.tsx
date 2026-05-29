'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { CalendarCheck, ArrowLeft } from 'lucide-react'
import type { Customer, Service, User } from '@/types'

export default function NewBookingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [form, setForm] = React.useState({
    customerId: '',
    serviceId: '',
    startTime: '',
    technicianId: '',
    notes: '',
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-for-booking'],
    queryFn: async () => {
      const { data } = await api.get('/customers')
      return data.data as Customer[]
    },
  })

  const { data: services } = useQuery({
    queryKey: ['services-for-booking'],
    queryFn: async () => {
      const { data } = await api.get('/services')
      return data.data as Service[]
    },
  })

  const { data: technicians } = useQuery({
    queryKey: ['technicians-for-booking'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { role: 'TECHNICIAN' } })
      return data.data as User[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/bookings', {
        customerId: form.customerId,
        serviceId: form.serviceId,
        startTime: new Date(form.startTime).toISOString(),
        technicianId: form.technicianId || undefined,
        notes: form.notes || undefined,
      })
      return data.data
    },
    onSuccess: (booking) => {
      addToast('Booking created', 'success')
      router.push(`/bookings/${booking.id}`)
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to create booking', 'error')
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Booking</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create a new booking for a customer</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
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
            <Select
              label="Service"
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              options={[
                { value: '', label: 'Select service...' },
                ...(services?.map((s) => ({ value: s.id, label: `${s.name} (${s.duration}min - ₦${s.price})` })) || []),
              ]}
              required
            />
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
            <Select
              label="Technician (optional)"
              value={form.technicianId}
              onChange={(e) => setForm({ ...form, technicianId: e.target.value })}
              options={[
                { value: '', label: 'Auto-assign' },
                ...(technicians?.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })) || []),
              ]}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="flex h-20 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                placeholder="Any special instructions..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Link href="/bookings">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner size="sm" /> : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
