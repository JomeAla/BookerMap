'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Clock, Star } from 'lucide-react'

export default function WidgetPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const [step, setStep] = React.useState(1)
  const [selectedServiceId, setSelectedServiceId] = React.useState('')
  const [selectedDate, setSelectedDate] = React.useState('')
  const [selectedTime, setSelectedTime] = React.useState('')
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' })

  const { data: tenant } = useQuery({
    queryKey: ['widget-tenant', tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`/public/tenants/${tenantSlug}`)
      return data.data
    },
  })

  const { data: services } = useQuery({
    queryKey: ['widget-services', tenantSlug],
    queryFn: async () => {
      const { data } = await api.get(`/public/${tenantSlug}/services`)
      return data.data
    },
  })

  const { data: slots } = useQuery({
    queryKey: ['widget-slots', tenantSlug, selectedServiceId, selectedDate],
    queryFn: async () => {
      if (!selectedServiceId || !selectedDate) return []
      const { data } = await api.get(`/public/${tenantSlug}/slots?serviceId=${selectedServiceId}&date=${selectedDate}`)
      return data.data as string[]
    },
    enabled: !!selectedServiceId && !!selectedDate,
  })

  const selectedService = services?.find((s: any) => s.id === selectedServiceId)

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const startTime = `${selectedDate}T${selectedTime}:00.000Z`
      const { data } = await api.post(`/public/${tenantSlug}/bookings`, {
        serviceId: selectedServiceId,
        startTime,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone,
      })
      return data.data
    },
    onSuccess: () => {
      setStep(4)
      window.parent.postMessage({ type: 'booking-confirmed', tenantSlug }, '*')
    },
    onError: () => {},
  })

  React.useEffect(() => {
    const height = document.documentElement.scrollHeight
    window.parent.postMessage({ type: 'widget-resize', height }, '*')
  }, [step, selectedServiceId, selectedDate, selectedTime])

  const nextStep = () => {
    if (step === 1 && !selectedServiceId) return
    if (step === 2 && (!selectedDate || !selectedTime)) return
    if (step === 3 && (!form.firstName || !form.lastName || !form.phone)) return
    setStep((s) => Math.min(s + 1, 4))
  }

  const primaryColor = tenant?.primaryColor || '#3B82F6'

  return (
    <div className="min-h-0">
      <div className="p-3">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white transition-colors"
                style={{ backgroundColor: step >= s ? primaryColor : '#d1d5db' }}
              >
                {s}
              </div>
              {s < 4 && <div className="h-0.5 w-6" style={{ backgroundColor: step > s ? primaryColor : '#d1d5db' }} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Select a Service</p>
            {!services ? (
              <Spinner />
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {services.filter((s: any) => s.isActive).map((service: any) => (
                  <div
                    key={service.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedServiceId(service.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedServiceId(service.id) }}
                    className="p-3 rounded-lg border-2 cursor-pointer transition-all text-sm"
                    style={{
                      borderColor: selectedServiceId === service.id ? primaryColor : '#e5e7eb',
                      backgroundColor: selectedServiceId === service.id ? `${primaryColor}10` : 'transparent',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold" style={{ color: primaryColor }}>{formatCurrency(service.price)}</p>
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900">Pick Date & Time</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime('') }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2"
              style={{ accentColor: primaryColor }}
            />
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
                {slots.map((time: string) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className="p-1.5 text-xs rounded-lg border transition-colors"
                    style={{
                      borderColor: selectedTime === time ? primaryColor : '#e5e7eb',
                      backgroundColor: selectedTime === time ? `${primaryColor}10` : 'transparent',
                      color: selectedTime === time ? primaryColor : undefined,
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
            {slots && slots.length === 0 && selectedDate && (
              <p className="text-xs text-gray-500 text-center py-4">No available slots for this date</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900">Your Information</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="First Name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input placeholder="Last Name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {selectedService && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">{selectedService.name} &middot; {selectedDate} at {selectedTime}</p>
                <p className="text-base font-bold mt-1" style={{ color: primaryColor }}>{formatCurrency(selectedService.price)}</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Booking Confirmed!</h2>
            <p className="text-xs text-gray-500">Confirmation sent to {form.email || form.phone}</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          {step > 1 && step < 4 && (
            <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-3 w-3 mr-1" /> Back
            </Button>
          )}
          {step < 4 && (
            <Button
              size="sm"
              className="ml-auto text-white text-xs"
              style={{ backgroundColor: primaryColor }}
              onClick={step === 3 ? () => bookingMutation.mutate() : nextStep}
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending ? <Spinner size="sm" /> : step === 3 ? 'Confirm & Book' : 'Continue'}
              {step < 3 && <ChevronRight className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
