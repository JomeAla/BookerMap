'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, User, Phone, Mail, Clock, Wrench, DollarSign, MapPin } from 'lucide-react'
import type { Booking, Dispatch } from '@/types'

export default function BookingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`)
      return data.data as Booking
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { data } = await api.patch(`/bookings/${id}`, { status })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      addToast('Booking status updated', 'success')
    },
    onError: () => addToast('Failed to update status', 'error'),
  })

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/bookings/${id}/dispatch`, {})
      return data.data as Dispatch
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      addToast('Technician dispatched', 'success')
    },
    onError: () => addToast('Failed to dispatch', 'error'),
  })

  if (isLoading) return <PageLoader />
  if (!booking) return <div className="text-center py-12 text-gray-500">Booking not found</div>

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {booking.id}</p>
          </div>
          <StatusBadge status={booking.status} className="text-sm px-3 py-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{booking.customer?.firstName} {booking.customer?.lastName}</span>
            </div>
            {booking.customer?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{booking.customer.email}</span>
              </div>
            )}
            {booking.customer?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{booking.customer.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{booking.service?.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{formatDate(booking.startTime, 'MMM d, yyyy')} at {formatDate(booking.startTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Ends {formatDate(booking.endTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-semibold">{formatCurrency(booking.totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dispatch</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {booking.dispatch ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{booking.dispatch.assignedTo?.firstName} {booking.dispatch.assignedTo?.lastName}</span>
                </div>
                <StatusBadge status={booking.dispatch.status} />
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Not yet dispatched</p>
                <Button size="sm" onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>
                  Dispatch Technician
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].filter((s) => s !== booking.status).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}
                onClick={() => statusMutation.mutate({ status })}
                disabled={statusMutation.isPending}
              >
                Mark as {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
