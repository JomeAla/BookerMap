'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardTitle, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Clock, Building2 } from 'lucide-react'
import { ChatWidget } from '@/components/chat/chat-widget'
import PublicReviewList from '@/components/reviews/public-review-list'
import type { Service, Tenant } from '@/types'

export default function PublicBookingPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const { addToast } = useToast()
  const [step, setStep] = React.useState(1)
  const [selectedServiceId, setSelectedServiceId] = React.useState('')
  const [selectedDate, setSelectedDate] = React.useState('')
  const [selectedTime, setSelectedTime] = React.useState('')
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' })

  const { data: tenant } = useQuery({
    queryKey: ['public-tenant', tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`/public/tenants/${tenantSlug}`)
      return data.data as Tenant
    },
  })

  const { data: services } = useQuery({
    queryKey: ['public-services', tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`/public/${tenantSlug}/services`)
      return data.data as Service[]
    },
  })

  const selectedService = services?.find((s) => s.id === selectedServiceId)

  const fallbackSlots = React.useMemo(() => {
    const slots = []
    for (let h = 8; h <= 17; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`)
      if (h < 17) slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return slots
  }, [])

  const { data: apiSlots } = useQuery({
    queryKey: ['public-slots', tenantSlug, selectedServiceId, selectedDate],
    queryFn: async () => {
      if (!selectedServiceId || !selectedDate) return []
      try {
        const { data } = await api.get(`/public/${tenantSlug}/slots?serviceId=${selectedServiceId}&date=${selectedDate}`)
        return data.data as string[]
      } catch {
        return []
      }
    },
    enabled: !!selectedServiceId && !!selectedDate,
  })

  const timeSlots = apiSlots && apiSlots.length > 0 ? apiSlots : fallbackSlots

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const startTime = `${selectedDate}T${selectedTime}:00.000Z`
      const endTime = new Date(new Date(startTime).getTime() + (selectedService?.duration || 60) * 60000).toISOString()
      const { data } = await api.post(`/public/${tenantSlug}/bookings`, {
        serviceId: selectedServiceId,
        startTime,
        endTime,
        customer: form,
      })
      return data.data
    },
    onSuccess: () => {
      addToast('Booking confirmed!', 'success')
      setStep(4)
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Booking failed', 'error')
    },
  })

  const nextStep = () => {
    if (step === 1 && !selectedServiceId) { addToast('Please select a service', 'error'); return }
    if (step === 2 && (!selectedDate || !selectedTime)) { addToast('Please pick date and time', 'error'); return }
    if (step === 3 && (!form.firstName || !form.lastName || !form.phone)) { addToast('Please fill required fields', 'error'); return }
    setStep((s) => Math.min(s + 1, 4))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant?.name || 'Loading...'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Book your appointment</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`h-1 w-8 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <CardTitle className="text-lg mb-4">Select a Service</CardTitle>
                {!services ? (
                  <Spinner />
                ) : (
                  <div className="space-y-3">
                    {services.filter((s) => s.isActive).map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedServiceId === service.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{service.name}</h3>
                            {service.description && (
                              <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">{formatCurrency(service.price)}</p>
                            <p className="text-xs text-gray-500">{service.duration} min</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <CardTitle className="text-lg mb-4">Pick Date & Time</CardTitle>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" /> Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {selectedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      <Clock className="h-4 w-4 inline mr-1" /> Select Time
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 text-sm rounded-lg border transition-colors ${
                            selectedTime === time
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <CardTitle className="text-lg mb-4">Your Information</CardTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />

                {selectedService && (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                    <p className="text-sm text-gray-500">{selectedService.name} - {selectedService.duration} min</p>
                    <p className="text-sm text-gray-500">{selectedDate} at {selectedTime}</p>
                    <p className="text-lg font-bold text-blue-600 mt-2">{formatCurrency(selectedService.price)}</p>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  We&apos;ve sent a confirmation to {form.email || 'your phone'}.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              {step > 1 && step < 4 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < 4 && (
                <Button className="ml-auto" onClick={step === 3 ? () => bookingMutation.mutate() : nextStep} disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? <Spinner size="sm" /> : step === 3 ? 'Confirm & Book' : 'Continue'}
                  {step < 3 && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <PublicReviewList tenantSlug={tenantSlug} />
      </div>
      <ChatWidget tenantSlug={tenantSlug} />
    </div>
  )
}
