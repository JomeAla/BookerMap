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
import { CalendarCheck, ArrowLeft, RotateCcw, Tag, CheckCircle2, XCircle } from 'lucide-react'
import type { Customer, Service, User, Location as BizLocation } from '@/types'

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export default function NewBookingPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [form, setForm] = React.useState({
    customerId: '',
    serviceId: '',
    startTime: '',
    technicianId: '',
    locationId: '',
    notes: '',
    isRecurring: false,
    frequency: 'WEEKLY',
    interval: 1,
    dayOfWeek: '1',
    dayOfMonth: '1',
    endDate: '',
    discount: 0,
    couponCode: '',
    couponDiscount: 0,
  })
  const [couponStatus, setCouponStatus] = React.useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [couponMessage, setCouponMessage] = React.useState('')

  const { data: customers } = useQuery({
    queryKey: ['customers-for-booking'],
    queryFn: async () => {
      const { data } = await api.get('/customers')
      return data.data as Customer[]
    },
  })

  const { data: services } = useQuery({
    queryKey: ['services-for-booking', form.locationId],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (form.locationId) params.locationId = form.locationId
      const { data } = await api.get('/services', { params })
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

  const { data: locations } = useQuery({
    queryKey: ['locations-for-booking'],
    queryFn: async () => {
      const { data } = await api.get('/locations')
      return data.data as BizLocation[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (form.isRecurring) {
        const { data } = await api.post('/recurring-bookings', {
          customerId: form.customerId,
          serviceId: form.serviceId,
          startDate: new Date(form.startTime).toISOString(),
          technicianId: form.technicianId || undefined,
          notes: form.notes || undefined,
          frequency: form.frequency,
          interval: form.interval,
          dayOfWeek: form.frequency === 'WEEKLY' ? parseInt(form.dayOfWeek) : undefined,
          dayOfMonth: form.frequency === 'MONTHLY' ? parseInt(form.dayOfMonth) : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          discount: form.discount || 0,
        })
        return data.data
      }
      const { data } = await api.post('/bookings', {
        customerId: form.customerId,
        serviceId: form.serviceId,
        startTime: new Date(form.startTime).toISOString(),
        technicianId: form.technicianId || undefined,
        locationId: form.locationId || undefined,
        notes: form.notes || undefined,
        couponCode: form.couponCode || undefined,
        couponDiscount: form.couponDiscount || undefined,
      })
      return data.data
    },
    onSuccess: (result) => {
      addToast(form.isRecurring ? 'Recurring schedule created' : 'Booking created', 'success')
      router.push(form.isRecurring ? '/bookings/recurring' : `/bookings/${result.id}`)
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
            <Select
              label="Location (optional)"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              options={[
                { value: '', label: 'No location' },
                ...(locations?.map((l) => ({ value: l.id, label: l.name })) || []),
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
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Coupon Code</span>
              </label>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={form.couponCode}
                  onChange={(e) => { setForm({ ...form, couponCode: e.target.value.toUpperCase() }); setCouponStatus('idle') }}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  disabled={couponStatus === 'valid'}
                />
                {couponStatus !== 'valid' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!form.couponCode || couponStatus === 'validating'}
                    onClick={async () => {
                      setCouponStatus('validating')
                      try {
                        const svc = services?.find(s => s.id === form.serviceId)
                        const amount = svc?.price || 0
                        const { data } = await api.get('/coupons/validate', { params: { code: form.couponCode, amount } })
                        const result = data.data as any
                        setCouponStatus('valid')
                        setCouponMessage(`Discount: ${result.discount > 0 ? `-${result.discount}` : '₦0'}`)
                        setForm(f => ({ ...f, couponDiscount: result.discount }))
                      } catch (err: any) {
                        setCouponStatus('invalid')
                        setCouponMessage(err.response?.data?.message || 'Invalid coupon')
                        setForm(f => ({ ...f, couponDiscount: 0 }))
                      }
                    }}
                  >
                    {couponStatus === 'validating' ? <Spinner size="sm" /> : 'Apply'}
                  </Button>
                )}
                {couponStatus === 'valid' && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setForm(f => ({ ...f, couponCode: '', couponDiscount: 0 })); setCouponStatus('idle'); setCouponMessage('') }}>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
              {couponMessage && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${couponStatus === 'valid' ? 'text-green-600' : 'text-red-500'}`}>
                  {couponStatus === 'valid' ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {couponMessage}
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Make Recurring</span>
              </label>
            </div>

            {form.isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                <Select
                  label="Frequency"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  options={[
                    { value: 'DAILY', label: 'Daily' },
                    { value: 'WEEKLY', label: 'Weekly' },
                    { value: 'MONTHLY', label: 'Monthly' },
                  ]}
                />
                <Input
                  label={`Repeat every ${form.frequency.toLowerCase()} (interval)`}
                  type="number"
                  min={1}
                  max={365}
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: parseInt(e.target.value) || 1 })}
                />
                {form.frequency === 'WEEKLY' && (
                  <Select
                    label="Day of Week"
                    value={form.dayOfWeek}
                    onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                    options={DAYS_OF_WEEK}
                  />
                )}
                {form.frequency === 'MONTHLY' && (
                  <Input
                    label="Day of Month"
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                  />
                )}
                <Input
                  label="End Date (optional)"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                <Input
                  label="Discount (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/bookings">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner size="sm" /> : form.isRecurring ? 'Create Schedule' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
